import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { EditarFisioterapeutaPort } from '../../domain/ports/editar-fisioterapeuta.port';
import type { CambiosFisioterapeuta } from '../../domain/ports/editar-fisioterapeuta.port';
import type { CrearFisioterapeuta } from '../../domain/models/fisioterapeuta.model';
import { RegistroFisioterapeutaError } from '../../domain/errors/registro-fisioterapeuta.error';
@Injectable()
export class PostgresEditarFisioterapeutaRepository implements EditarFisioterapeutaPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly db: DataSource,
    ) {}
    async editar(
        id: number,
        actor: number,
        preparar: (actual: CrearFisioterapeuta) => CambiosFisioterapeuta,
    ) {
        try {
            return await this.db.transaction(async (m) => {
                const [actual] = await m.query<
                    (CrearFisioterapeuta & { idPersona: number })[]
                >(
                    `SELECT p.id AS "idPersona",p.ci,p.complemento,p.nombres,p.p_apellido AS "primerApellido",p.s_apellido AS "segundoApellido",p.sexo,p.es_extranjero AS "esExtranjero",p.fecha_nacimiento::text AS "fechaNacimiento",p.id_estado_civil AS "idEstadoCivil",p.id_dept_exp AS "idDeptExp",CASE WHEN e.permanente THEN 'PERMANENTE' ELSE 'EVENTUAL' END AS "tipoContrato",e.fecha_contrato_inicio::text AS "fechaContratoInicio",e.fecha_contrato_fin::text AS "fechaContratoFin",e.grado_academico AS "gradoAcademico" FROM plataforma.especialista e JOIN administracion.persona p ON p.id=e.id_persona WHERE e.id=$1 AND e.id_especialidad=89 FOR UPDATE OF e,p`,
                    [id],
                );
                if (!actual)
                    throw new RegistroFisioterapeutaError(
                        'no_encontrado',
                        'Fisioterapeuta no encontrado',
                    );
                const d = preparar(actual);
                await m.query(
                    'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
                    ['fisioterapeuta:ci:' + d.claveUnica],
                );
                const dup = await m.query(
                    "SELECT id FROM administracion.persona WHERE id<>$1 AND (clave_unica=$2 OR (ci=$3 AND COALESCE(complemento,'')=$4)) LIMIT 1",
                    [actual.idPersona, d.claveUnica, d.ci, d.complemento ?? ''],
                );
                if (dup.length)
                    throw new RegistroFisioterapeutaError(
                        'conflicto',
                        'Otra persona tiene el mismo documento',
                    );
                const [refs] = await m.query(
                    'SELECT EXISTS(SELECT 1 FROM administracion.estado_civil WHERE id=$1) AS civil, EXISTS(SELECT 1 FROM administracion.departamento WHERE id=$2) AS expedido',
                    [d.idEstadoCivil, d.idDeptExp],
                );
                if (!refs.civil || !refs.expedido)
                    throw new RegistroFisioterapeutaError(
                        'validacion',
                        'Estado civil o expedido inexistente',
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
                        actor,
                        actual.idPersona,
                    ],
                );
                await m.query(
                    'UPDATE plataforma.especialista SET permanente=$1,fecha_contrato_inicio=$2,fecha_contrato_fin=$3,grado_academico=$4,id_user_updated=$5,updated_at=NOW() WHERE id=$6',
                    [
                        d.tipoContrato === 'PERMANENTE',
                        d.fechaContratoInicio,
                        d.fechaContratoFin,
                        d.gradoAcademico,
                        actor,
                        id,
                    ],
                );
                await m.query(
                    'UPDATE administracion.users SET name=$1,id_user_updated=$2,updated_at=NOW() WHERE id_persona=$3',
                    [d.nombreUsuario, actor, actual.idPersona],
                );
                return {
                    idEspecialista: id,
                    idPersona: actual.idPersona,
                    matricula: d.matricula,
                };
            });
        } catch (error) {
            if (error instanceof RegistroFisioterapeutaError) throw error;
            const code = (error as { driverError?: { code?: string } })
                .driverError?.code;
            if (code === '23505')
                throw new RegistroFisioterapeutaError(
                    'conflicto',
                    'Datos �nicos duplicados',
                );
            if (code === '23503' || code === '23514')
                throw new RegistroFisioterapeutaError(
                    'validacion',
                    'Datos incompatibles con las restricciones de la base',
                );
            throw new Error(
                'No se pudo editar el fisioterapeuta; transacci�n revertida',
            );
        }
    }
    async estado(id: number, actor: number, estado: boolean) {
        const [rows] = await this.db.query<
            [{ idEspecialista: number; estado: boolean }[], number]
        >(
            'UPDATE plataforma.especialista SET estado=$1,id_user_updated=$2,updated_at=NOW() WHERE id=$3 AND id_especialidad=89 RETURNING id AS "idEspecialista",estado',
            [estado, actor, id],
        );
        const row = rows[0];
        if (!row)
            throw new RegistroFisioterapeutaError(
                'no_encontrado',
                'Fisioterapeuta no encontrado: el ID no existe o no pertenece a la especialidad de fisioterapia',
            );
        return row;
    }
}
