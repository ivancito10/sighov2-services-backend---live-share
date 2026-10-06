import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../config/database.constants';
import { PersonaPort } from '../domain/persona';
import type { FiltroPersona, PersonaBase } from '../domain/persona';

const columnas = `p.id,p.id AS "idPersona",p.ci,p.complemento,p.nombres,
    p.p_apellido,p.s_apellido,p.matricula_seguro,p.fecha_nacimiento::text AS fecha_nacimiento,
    p.p_apellido AS "primerApellido",p.s_apellido AS "segundoApellido",
    TRIM(CONCAT_WS(' ',p.nombres,NULLIF(p.p_apellido,''),NULLIF(p.s_apellido,''))) AS "nombreCompleto",
    p.matricula_seguro AS matricula,p.fecha_nacimiento::text AS "fechaNacimiento",
    p.sexo,p.es_extranjero AS "esExtranjero",
    CASE WHEN p.es_extranjero IS TRUE THEN 'EXTRANJERO' WHEN p.es_extranjero IS FALSE THEN 'NACIONAL' ELSE NULL END AS "tipoDocumento",
    p.id_estado_civil AS "idEstadoCivil",p.id_dept_exp AS "idDeptExp",
    p.id_nacimiento_municipio AS "idNacimientoMunicipio",p.id_tipo_asegurado AS "idTipoAsegurado",
    p.afiliado,p.estado_asuss AS "estadoAsuss",
    json_build_object('id',p.id_dept_exp,'nombre',d.nombre,'sigla',d.sigla) AS expedido,
    json_build_object('id',p.id_estado_civil,'nombre',ec.nombre) AS "estadoCivil",
    json_build_object('id',p.id_nacimiento_municipio,'nombre',m.nombre) AS "municipioNacimiento",
    json_build_object('id',p.id_tipo_asegurado,'nombre',ta.tipo_asegurado) AS "tipoAsegurado",
    json_build_object('id',p.id_user_created,'nombre',uc.name) AS "usuarioCreador",
    json_build_object('id',p.id_user_updated,'nombre',uu.name) AS "usuarioActualizador"`;
const tablas = `FROM administracion.persona p
    LEFT JOIN administracion.departamento d ON d.id=p.id_dept_exp
    LEFT JOIN administracion.estado_civil ec ON ec.id=p.id_estado_civil
    LEFT JOIN administracion.municipio m ON m.id=p.id_nacimiento_municipio
    LEFT JOIN administracion.tipo_asegurado ta ON ta.id=p.id_tipo_asegurado
    LEFT JOIN administracion.users uc ON uc.id=p.id_user_created
    LEFT JOIN administracion.users uu ON uu.id=p.id_user_updated`;
@Injectable()
export class PostgresPersonasRepository implements PersonaPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly db: DataSource,
    ) {}
    async listar(f: FiltroPersona) {
        const patron = '%' + f.buscar.replace(/[\\%_]/g, '\\$&') + '%';
        const where = `WHERE p.ci ILIKE $1 OR COALESCE(p.matricula_seguro,'') ILIKE $1 OR CONCAT_WS(' ',p.nombres,p.p_apellido,p.s_apellido) ILIKE $1`;
        const [datos, cuenta] = await Promise.all([
            this.db.query<PersonaBase[]>(
                `SELECT ${columnas} ${tablas} ${where} ORDER BY p.p_apellido NULLS LAST,p.s_apellido NULLS LAST,p.nombres,p.id LIMIT $2 OFFSET $3`,
                [patron, f.limite, (f.pagina - 1) * f.limite],
            ),
            this.db.query<{ total: string }[]>(
                `SELECT COUNT(*)::text AS total FROM administracion.persona p ${where}`,
                [patron],
            ),
        ]);
        return { datos, total: Number(cuenta[0].total) };
    }
    async obtener(id: string) {
        const rows = await this.db.query<PersonaBase[]>(
            `SELECT ${columnas} ${tablas} WHERE p.id=$1`,
            [id],
        );
        return rows[0] ?? null;
    }
}
