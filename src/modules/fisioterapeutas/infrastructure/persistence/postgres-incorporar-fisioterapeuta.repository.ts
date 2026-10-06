import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { IncorporarFisioterapeutaPort } from '../../domain/ports/incorporar-fisioterapeuta.port';
import type { SeleccionIncorporacion } from '../../domain/ports/incorporar-fisioterapeuta.port';
import type { RegistroFisioterapeuta } from '../../domain/models/fisioterapeuta.model';
import { RegistroFisioterapeutaError as ErrorRegistro } from '../../domain/errors/registro-fisioterapeuta.error';

function seleccionar<T extends { id: string | number }>(
    rows: T[],
    id: string | number | undefined,
    recurso: string,
): T | undefined {
    if (id !== undefined) {
        const row = rows.find((r) => String(r.id) === String(id));
        if (!row)
            throw new ErrorRegistro(
                'validacion',
                `${recurso} no pertenece a la persona seleccionada`,
            );
        return row;
    }
    if (rows.length > 1)
        throw new ErrorRegistro(
            'conflicto',
            `Existen varios registros de ${recurso}; envíe su ID explícitamente`,
        );
    return rows[0];
}
@Injectable()
export class PostgresIncorporarFisioterapeutaRepository implements IncorporarFisioterapeutaPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly db: DataSource,
    ) {}
    async incorporar(s: SeleccionIncorporacion, d: RegistroFisioterapeuta) {
        try {
            return await this.db.transaction(async (m) => {
                // Serializa incorporaciones de la misma persona y comparte claves con la creación.
                await m.query(
                    'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
                    ['fisioterapeuta:persona:' + s.idPersona],
                );
                const personas = await m.query(
                    'SELECT id FROM administracion.persona WHERE id=$1 FOR UPDATE',
                    [s.idPersona],
                );
                if (!personas.length)
                    throw new ErrorRegistro(
                        'no_encontrado',
                        'Persona no encontrada; utilice creación desde cero si no existe',
                    );
                for (const key of [
                    'fisioterapeuta:ci:' + d.claveUnica,
                    'fisioterapeuta:email:' + d.email,
                ].sort())
                    await m.query(
                        'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
                        [key],
                    );
                const especialistas = await m.query<{ id: number }[]>(
                    'SELECT id FROM plataforma.especialista WHERE id_persona=$1 ORDER BY id FOR UPDATE',
                    [s.idPersona],
                );
                const usuarios = await m.query<
                    { id: string; email: string | null }[]
                >(
                    'SELECT id::text AS id,email FROM administracion.users WHERE id_persona=$1 ORDER BY id FOR UPDATE',
                    [s.idPersona],
                );
                const especialista = seleccionar(
                    especialistas,
                    s.idEspecialista,
                    'especialista',
                );
                const usuario = seleccionar(usuarios, s.idUsuario, 'usuario');
                const duplicados = await m.query(
                    "SELECT id FROM administracion.persona WHERE id<>$1 AND (clave_unica=$2 OR (ci=$3 AND COALESCE(complemento,'')=$4)) LIMIT 1",
                    [s.idPersona, d.claveUnica, d.ci, d.complemento ?? ''],
                );
                if (duplicados.length)
                    throw new ErrorRegistro(
                        'conflicto',
                        'Otra persona tiene el mismo documento',
                    );
                const [refs] = await m.query(
                    `SELECT
                    EXISTS(SELECT 1 FROM administracion.estado_civil WHERE id=$1) AS civil,
                    EXISTS(SELECT 1 FROM administracion.departamento WHERE id=$2) AS expedido,
                    EXISTS(SELECT 1 FROM administracion.especialidad WHERE id=89) AS especialidad,
                    EXISTS(SELECT 1 FROM administracion.users WHERE id=$3 AND estado=true) AS actor`,
                    [d.idEstadoCivil, d.idDeptExp, d.idUsuarioCreador],
                );
                if (
                    !refs.civil ||
                    !refs.expedido ||
                    !refs.especialidad ||
                    !refs.actor
                )
                    throw new ErrorRegistro(
                        'validacion',
                        'Catálogos o usuario autenticado inexistentes/inactivos',
                    );
                await m.query(
                    `UPDATE administracion.persona SET ci=$1,complemento=$2,nombres=$3,p_apellido=$4,s_apellido=$5,sexo=$6,es_extranjero=$7,fecha_nacimiento=$8,id_estado_civil=$9,id_dept_exp=$10,matricula_seguro=$11,clave_unica=$12,id_user_updated=$13,updated_at=NOW() WHERE id=$14`,
                    [
                        d.ci,
                        d.complemento,
                        d.nombres,
                        d.primerApellido,
                        d.segundoApellido,
                        d.sexo,
                        d.esExtranjero,
                        d.fechaNacimiento,
                        d.idEstadoCivil,
                        d.idDeptExp,
                        d.matricula,
                        d.claveUnica,
                        d.idUsuarioCreador,
                        s.idPersona,
                    ],
                );
                let idEspecialista = especialista?.id;
                if (especialista) {
                    await m.query(
                        `UPDATE plataforma.especialista SET id_especialidad=89,permanente=$1,fecha_contrato_inicio=$2,fecha_contrato_fin=$3,grado_academico=$4,estado=true,afiliados=true,estudiantes=true,convenios=true,externo=false,especialista_imagenologia=false,id_user_updated=$5,updated_at=NOW() WHERE id=$6`,
                        [
                            d.permanente,
                            d.fechaContratoInicio,
                            d.fechaContratoFin,
                            d.gradoAcademico,
                            d.idUsuarioCreador,
                            especialista.id,
                        ],
                    );
                } else {
                    const [nuevo] = await m.query<{ id: number }[]>(
                        `INSERT INTO plataforma.especialista (id_persona,id_especialidad,permanente,fecha_contrato_inicio,fecha_contrato_fin,grado_academico,estado,afiliados,estudiantes,convenios,externo,especialista_imagenologia,id_user_created,created_at,updated_at) VALUES ($1,89,$2,$3,$4,$5,true,true,true,true,false,false,$6,NOW(),NOW()) RETURNING id`,
                        [
                            s.idPersona,
                            d.permanente,
                            d.fechaContratoInicio,
                            d.fechaContratoFin,
                            d.gradoAcademico,
                            d.idUsuarioCreador,
                        ],
                    );
                    idEspecialista = nuevo.id;
                    await m.query(
                        'UPDATE plataforma.especialista SET foto=$1 WHERE id=$2',
                        [String(idEspecialista) + '.jpg', idEspecialista],
                    );
                }
                let idUsuario = usuario?.id;
                let email = usuario?.email ?? null;
                if (usuario) {
                    // La incorporación no restablece credenciales ni reactiva una cuenta bloqueada.
                    await m.query(
                        'UPDATE administracion.users SET name=$1,id_user_updated=$2,updated_at=NOW() WHERE id=$3',
                        [d.nombreUsuario, d.idUsuarioCreador, usuario.id],
                    );
                } else {
                    email = d.email;
                    const [local, dominio] = d.email.split('@');
                    for (let n = 0; ; n++) {
                        const usados = await m.query(
                            'SELECT id FROM administracion.users WHERE LOWER(email)=LOWER($1) LIMIT 1',
                            [email],
                        );
                        if (!usados.length) break;
                        if (n >= 9999)
                            throw new ErrorRegistro(
                                'conflicto',
                                'No se pudo asignar un correo disponible',
                            );
                        const sufijo = String(n + 1);
                        email =
                            local.slice(0, 64 - sufijo.length) +
                            sufijo +
                            '@' +
                            dominio;
                    }
                    const [nuevo] = await m.query<{ id: string }[]>(
                        `INSERT INTO administracion.users (name,email,password,estado,id_persona,id_user_created,created_at,updated_at) VALUES ($1,$2,$3,true,$4,$5,NOW(),NOW()) RETURNING id::text AS id`,
                        [
                            d.nombreUsuario,
                            email,
                            d.passwordHash,
                            s.idPersona,
                            d.idUsuarioCreador,
                        ],
                    );
                    idUsuario = nuevo.id;
                    await m.query(
                        'UPDATE administracion.users SET imagen=$1 WHERE id=$2',
                        [idUsuario + '-U.png', idUsuario],
                    );
                }
                return {
                    idPersona: s.idPersona,
                    idEspecialista: idEspecialista!,
                    idUsuario: idUsuario!,
                    especialistaCreado: !especialista,
                    usuarioCreado: !usuario,
                    email,
                    matricula: d.matricula,
                };
            });
        } catch (error) {
            if (error instanceof ErrorRegistro) throw error;
            const e = error as {
                code?: string;
                driverError?: { code?: string };
            };
            const code = e.driverError?.code ?? e.code;
            if (code === '23505' || code === '40P01' || code === '40001')
                throw new ErrorRegistro(
                    'conflicto',
                    'Conflicto de datos o modificación concurrente; vuelva a consultar e intente nuevamente',
                );
            if (code === '23503' || code === '23514')
                throw new ErrorRegistro(
                    'validacion',
                    'Datos incompatibles con las restricciones de la base',
                );
            throw new Error(
                'No se pudo incorporar al fisioterapeuta; la transacción fue revertida',
            );
        }
    }
}
