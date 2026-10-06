import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { FisioterapeutasRepositoryPort } from '../../domain/ports/fisioterapeutas.repository.port';
import type {
    RegistroFisioterapeuta,
    FisioterapeutaCreado,
    CatalogosFisioterapeuta,
} from '../../domain/models/fisioterapeuta.model';
import { RegistroFisioterapeutaError } from '../../domain/errors/registro-fisioterapeuta.error';
@Injectable()
export class PostgresFisioterapeutasRepository implements FisioterapeutasRepositoryPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly dataSource: DataSource,
    ) {}
    async catalogos(): Promise<CatalogosFisioterapeuta> {
        const [estadosCiviles, expedidos] = await Promise.all([
            this.dataSource.query(
                'SELECT id, nombre FROM administracion.estado_civil ORDER BY id',
            ),
            this.dataSource.query(
                'SELECT id, nombre, sigla FROM administracion.departamento ORDER BY id',
            ),
        ]);
        return { estadosCiviles, expedidos };
    }
    async crear(d: RegistroFisioterapeuta): Promise<FisioterapeutaCreado> {
        try {
            return await this.dataSource.transaction(async (manager) => {
                // Serializa registros de este módulo con la misma identidad o correo base.
                // Los índices UNIQUE de BD siguen siendo necesarios para otros clientes escritores.
                for (const key of [
                    'fisioterapeuta:ci:' + d.claveUnica,
                    'fisioterapeuta:email:' + d.email,
                ].sort()) {
                    await manager.query(
                        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
                        [key],
                    );
                }
                const duplicados = await manager.query(
                    "SELECT id FROM administracion.persona WHERE clave_unica = $1 OR (ci = $2 AND COALESCE(complemento, '') = $3) LIMIT 1",
                    [d.claveUnica, d.ci, d.complemento ?? ''],
                );
                if (duplicados.length)
                    throw new RegistroFisioterapeutaError(
                        'conflicto',
                        'La persona ya existe. Este endpoint solo registra fisioterapeutas desde cero',
                    );
                const [refs] = await manager.query(
                    `SELECT
     EXISTS(SELECT 1 FROM administracion.estado_civil WHERE id=$1) AS civil,
     EXISTS(SELECT 1 FROM administracion.departamento WHERE id=$2) AS expedido,
     EXISTS(SELECT 1 FROM administracion.municipio WHERE id=$3) AS municipio,
     EXISTS(SELECT 1 FROM administracion.tipo_asegurado WHERE id=1) AS asegurado,
     EXISTS(SELECT 1 FROM administracion.especialidad WHERE id=89) AS especialidad,
     EXISTS(SELECT 1 FROM administracion.users WHERE id=$4 AND estado=true) AS creador`,
                    [
                        d.idEstadoCivil,
                        d.idDeptExp,
                        d.idNacimientoMunicipio,
                        d.idUsuarioCreador,
                    ],
                );
                if (!refs.civil || !refs.expedido)
                    throw new RegistroFisioterapeutaError(
                        'validacion',
                        'Estado civil o expedido inexistente',
                    );
                if (!refs.creador)
                    throw new RegistroFisioterapeutaError(
                        'validacion',
                        'El usuario creador no existe o está inactivo',
                    );
                if (!refs.municipio || !refs.asegurado || !refs.especialidad)
                    throw new RegistroFisioterapeutaError(
                        'configuracion',
                        'Faltan el municipio configurado, el tipo de asegurado 1 o la especialidad 89',
                    );
                const [local, domain] = d.email.split('@');
                let email = d.email;
                for (let suffix = 0; ; suffix++) {
                    const rows = await manager.query(
                        'SELECT id FROM administracion.users WHERE LOWER(email) = LOWER($1) LIMIT 1',
                        [email],
                    );
                    if (!rows.length) break;
                    if (suffix >= 9999)
                        throw new RegistroFisioterapeutaError(
                            'conflicto',
                            'No se pudo asignar un correo disponible',
                        );
                    const next = String(suffix + 1);
                    email =
                        local.slice(0, 64 - next.length) + next + '@' + domain;
                }
                const [persona] = await manager.query(
                    `INSERT INTO administracion.persona
     (ci, complemento, nombres, p_apellido, s_apellido, sexo, id_estado_civil, id_nacimiento_municipio, id_dept_exp,
      fecha_nacimiento, matricula_seguro, id_tipo_asegurado, clave_unica, id_user_created, created_at, updated_at, es_extranjero)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,$12,$13,NOW(),NOW(),$14) RETURNING id`,
                    [
                        d.ci,
                        d.complemento,
                        d.nombres,
                        d.primerApellido,
                        d.segundoApellido,
                        d.sexo,
                        d.idEstadoCivil,
                        d.idNacimientoMunicipio,
                        d.idDeptExp,
                        d.fechaNacimiento,
                        d.matricula,
                        d.claveUnica,
                        d.idUsuarioCreador,
                        d.esExtranjero,
                    ],
                );
                const [especialista] = await manager.query(
                    `INSERT INTO plataforma.especialista
     (fecha_contrato_inicio, fecha_contrato_fin, permanente, estado, id_especialidad, id_persona, id_user_created,
      grado_academico, afiliados, estudiantes, convenios, externo, especialista_imagenologia, created_at, updated_at)
     VALUES ($1,$2,$3,true,89,$4,$5,$6,true,true,true,false,false,NOW(),NOW()) RETURNING id`,
                    [
                        d.fechaContratoInicio,
                        d.fechaContratoFin,
                        d.permanente,
                        persona.id,
                        d.idUsuarioCreador,
                        d.gradoAcademico,
                    ],
                );
                const foto = String(especialista.id) + '.jpg';
                await manager.query(
                    'UPDATE plataforma.especialista SET foto=$1 WHERE id=$2',
                    [foto, especialista.id],
                );
                const [usuario] = await manager.query(
                    `INSERT INTO administracion.users
     (name,email,password,estado,id_persona,id_user_created,created_at,updated_at)
     VALUES ($1,$2,$3,true,$4,$5,NOW(),NOW()) RETURNING id`,
                    [
                        d.nombreUsuario,
                        email,
                        d.passwordHash,
                        persona.id,
                        d.idUsuarioCreador,
                    ],
                );
                const imagen = String(usuario.id) + '-U.png';
                await manager.query(
                    'UPDATE administracion.users SET imagen=$1 WHERE id=$2',
                    [imagen, usuario.id],
                );
                return {
                    idPersona: Number(persona.id),
                    esExtranjero: d.esExtranjero,
                    idEspecialista: Number(especialista.id),
                    idUsuario: String(usuario.id),
                    nombreCompleto: d.nombreUsuario,
                    email,
                    matricula: d.matricula,
                    foto,
                    imagen,
                };
            });
        } catch (error) {
            if (error instanceof RegistroFisioterapeutaError) throw error;
            const code =
                (error as { driverError?: { code?: string }; code?: string })
                    .driverError?.code ?? (error as { code?: string }).code;
            if (code === '23505')
                throw new RegistroFisioterapeutaError(
                    'conflicto',
                    'Existe un registro con los mismos datos únicos',
                );
            if (code === '23503' || code === '23514')
                throw new RegistroFisioterapeutaError(
                    'validacion',
                    'Los datos no cumplen las relaciones o restricciones de la base',
                );
            // Evita que QueryFailedError exponga parámetros (incluido el hash) en los logs de Nest.
            throw new Error(
                'No se pudo registrar el fisioterapeuta; la transacción fue revertida',
            );
        }
    }
}
