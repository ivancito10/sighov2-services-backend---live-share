import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { ConsultaFisioterapeutasPort } from '../../domain/ports/consulta-fisioterapeutas.port';
import type {
    ConsultaFisioterapeutas,
    FisioterapeutaDatos,
    HorarioSemanalFisioterapeuta,
    SedeFisioterapia,
    FisioterapeutaListado,
} from '../../domain/models/consulta-fisioterapeuta.model';
const listado = `e.id AS "idEspecialista", p.id AS "idPersona", p.ci, p.complemento, p.matricula_seguro AS matricula,
 TRIM(CONCAT_WS(' ',p.nombres,NULLIF(p.p_apellido,''),NULLIF(p.s_apellido,''))) AS "nombreCompleto",
 CASE WHEN e.permanente IS TRUE THEN 'PERMANENTE' WHEN e.permanente IS FALSE THEN 'EVENTUAL' ELSE NULL END AS "tipoContrato",
 CASE WHEN e.permanente THEN NULL ELSE e.fecha_contrato_inicio::text END AS "contratoDesde",
 CASE WHEN e.permanente THEN NULL ELSE e.fecha_contrato_fin::text END AS "contratoHasta", e.estado`;
const datosModal = `p.nombres,p.p_apellido AS "primerApellido",p.s_apellido AS "segundoApellido",
 p.fecha_nacimiento::text AS "fechaNacimiento",p.sexo,e.foto,e.grado_academico AS "gradoAcademico",
 json_build_object('id',p.id_dept_exp,'sigla',d.sigla,'nombre',d.nombre) AS expedido,
 json_build_object('id',89,'nombre','FISIOTERAPIA') AS especialidad, p.es_extranjero AS "esExtranjero", CASE WHEN p.es_extranjero IS TRUE THEN 'EXTRANJERO' WHEN p.es_extranjero IS FALSE THEN 'NACIONAL' ELSE NULL END AS "tipoDocumento"`;
@Injectable()
export class PostgresConsultaFisioterapeutasRepository implements ConsultaFisioterapeutasPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly sighov: DataSource,
        @InjectDataSource(DB_CONNECTIONS.ETAPA2)
        private readonly etapa2: DataSource,
    ) {}
    async listar(c: ConsultaFisioterapeutas) {
        const patron = '%' + c.buscar.replace(/[\\%_]/g, '\\$&') + '%';
        const from = `FROM plataforma.especialista e JOIN administracion.persona p ON p.id=e.id_persona
        LEFT JOIN administracion.departamento d ON d.id=p.id_dept_exp
        WHERE e.id_especialidad=89 AND (p.ci ILIKE $1 OR COALESCE(p.matricula_seguro,'') ILIKE $1
        OR CONCAT_WS(' ',p.nombres,p.p_apellido,p.s_apellido) ILIKE $1)`;
        const [datos, count] = await Promise.all([
            this.sighov.query<FisioterapeutaListado[]>(
                `SELECT ${listado}, ${datosModal} ${from} ORDER BY p.p_apellido NULLS LAST,p.s_apellido NULLS LAST,p.nombres,e.id LIMIT $2 OFFSET $3`,
                [patron, c.limite, (c.pagina - 1) * c.limite],
            ),
            this.sighov.query<{ total: string }[]>(
                `SELECT COUNT(*)::text AS total ${from}`,
                [patron],
            ),
        ]);
        return { datos, total: Number(count[0].total) };
    }
    async buscar(id: string): Promise<FisioterapeutaDatos | null> {
        const rows = await this.sighov.query<FisioterapeutaDatos[]>(
            `SELECT ${listado}, ${datosModal}
       FROM plataforma.especialista e JOIN administracion.persona p ON p.id=e.id_persona
       LEFT JOIN administracion.departamento d ON d.id=p.id_dept_exp
       WHERE e.id=$1 AND e.id_especialidad=89`,
            [id],
        );
        return rows[0] ?? null;
    }
    horarios(id: string): Promise<HorarioSemanalFisioterapeuta[]> {
        return this.etapa2.query(
            `SELECT h.id::text AS "idHorario", a.id_especialista AS "idEspecialista",
            a.id::text AS "idAsignacionSede", a.id_sede AS "idSede", h.id_politica_agenda::text AS "idPoliticaAgenda",
            h.hora_inicio::text AS "horaInicio",h.hora_fin::text AS "horaFin",h.intervalo,
            h.vigente_desde::text AS "vigenteDesde",h.vigente_hasta::text AS "vigenteHasta",
            pa.cupos_normales AS "cuposNormales",pa.cupos_especiales AS "cuposEspeciales"
            FROM fisioterapia.asignaciones_sede a
            JOIN fisioterapia.horarios_semanales h ON h.id_asignacion_sede=a.id
            JOIN fisioterapia.politicas_agenda pa ON pa.id=h.id_politica_agenda
            WHERE a.id_especialista=$1 AND a.estado=true AND h.estado=true AND pa.estado=true
            AND (a.vigente_desde IS NULL OR a.vigente_desde<=CURRENT_DATE) AND (a.vigente_hasta IS NULL OR a.vigente_hasta>=CURRENT_DATE)
            AND (h.vigente_desde IS NULL OR h.vigente_desde<=CURRENT_DATE) AND (h.vigente_hasta IS NULL OR h.vigente_hasta>=CURRENT_DATE)
            AND (pa.vigente_desde IS NULL OR pa.vigente_desde<=CURRENT_DATE) AND (pa.vigente_hasta IS NULL OR pa.vigente_hasta>=CURRENT_DATE)
            ORDER BY h.hora_inicio,a.id_sede,h.id`,
            [id],
        );
    }
    sedes(ids: number[]): Promise<SedeFisioterapia[]> {
        if (!ids.length) return Promise.resolve([]);
        return this.sighov.query(
            'SELECT id,piso,ubicacion FROM plataforma.sedes WHERE id=ANY($1::int[])',
            [ids],
        );
    }
}
