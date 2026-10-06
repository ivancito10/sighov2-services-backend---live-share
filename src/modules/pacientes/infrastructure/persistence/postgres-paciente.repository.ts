import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { PacienteRepositoryPort } from '../../domain/ports/paciente.repository.port';
import { Paciente } from '../../domain/entities/paciente.entity';

@Injectable()
export class PostgresPacienteRepository implements PacienteRepositoryPort {
  constructor(
    @InjectDataSource(DB_CONNECTIONS.SIGHOV)
    private readonly dataSource: DataSource,
  ) { }

  async buscarPorId(idPersona: number): Promise<Paciente | null> {
    const query = `
      SELECT 
        p.id AS id_persona,
        COALESCE(p.ci, '') AS ci,
        COALESCE(p.matricula_seguro, '') AS matricula,
        TRIM(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) AS nombre_completo,
        TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
        COALESCE(p.sexo, '') AS sexo,
        COALESCE(ta.tipo_asegurado, 'NO ASEGURADO') AS tipo_asegurado,
        COALESCE(p.afiliado, true) AS estado,
        CASE 
          -- 1. ESTUDIANTE (id 11 o texto)
          WHEN p.id_tipo_asegurado = 11 OR UPPER(COALESCE(ta.tipo_asegurado, '')) LIKE '%ESTUDIANTE%' 
            THEN 'APORTE UMSA ESTUDIANTE'

          -- 2. CASOS DEL INTERIOR (id 9, 10 o texto)
          WHEN p.id_tipo_asegurado IN (9, 10) OR UPPER(COALESCE(ta.tipo_asegurado, '')) LIKE '%INTERIOR%' 
            THEN 'SEGURO SOCIAL UNIVERSITARIO DEL INTERIOR'

          -- 3. BENEFICIARIOS (Busca la institución patronal de su titular)
          WHEN UPPER(COALESCE(ta.tipo_asegurado, '')) LIKE '%BENEFICIARIO%' 
            THEN COALESCE(
              (
                SELECT inst.nombre
                FROM afiliacion.beneficiario b
                JOIN afiliacion.titular t ON t.id = b.id_titular
                JOIN afiliacion.titular_institucion ti ON ti.id_titular = t.id AND ti.estado = true
                JOIN aportes.institucion inst ON inst.id = ti.id_institucion
                WHERE b.id_persona = p.id
                ORDER BY 
                  (CASE WHEN UPPER(COALESCE(ti.tipo_institucion, '')) = 'PATRONAL' THEN 1 ELSE 2 END) ASC,
                  (CASE WHEN ti.fecha_baja IS NULL THEN 1 ELSE 2 END) ASC,
                  ti.updated_at DESC NULLS LAST
                LIMIT 1
              ),
              (
                SELECT inst.nombre 
                FROM afiliacion.beneficiario b
                JOIN afiliacion.beneficiario_institucion bi ON bi.id_beneficiario = b.id AND bi.estado = true
                JOIN aportes.institucion inst ON inst.id = bi.id_institucion
                WHERE b.id_persona = p.id
                ORDER BY bi.id ASC
                LIMIT 1
              ),
              'PARTICULAR / SIN INSTITUCIÓN'
            )

          -- 4. TITULARES (Prioriza PATRONAL, sin baja y más reciente)
          WHEN UPPER(COALESCE(ta.tipo_asegurado, '')) LIKE '%TITULAR%' 
            THEN COALESCE(
              (
                SELECT inst.nombre 
                FROM afiliacion.titular t
                JOIN afiliacion.titular_institucion ti ON ti.id_titular = t.id AND ti.estado = true
                JOIN aportes.institucion inst ON inst.id = ti.id_institucion
                WHERE t.id_persona = p.id
                ORDER BY 
                  (CASE WHEN UPPER(COALESCE(ti.tipo_institucion, '')) = 'PATRONAL' THEN 1 ELSE 2 END) ASC,
                  (CASE WHEN ti.fecha_baja IS NULL THEN 1 ELSE 2 END) ASC,
                  ti.updated_at DESC NULLS LAST
                LIMIT 1
              ),
              'PARTICULAR / SIN INSTITUCIÓN'
            )

          ELSE 'PARTICULAR / SIN INSTITUCIÓN'
        END AS institucion
      FROM administracion.persona p
      LEFT JOIN administracion.tipo_asegurado ta ON ta.id = p.id_tipo_asegurado
      WHERE p.id = $1
      LIMIT 1;
    `;

    const rows = await this.dataSource.query(query, [idPersona]);
    if (!rows || rows.length === 0) return null;

    const r = rows[0];
    return new Paciente(
      r.id_persona,
      r.ci,
      r.matricula,
      r.nombre_completo,
      r.fecha_nacimiento,
      r.sexo,
      r.tipo_asegurado,
      r.estado,
      r.institucion,
    );
  }

  async buscarPacientes(termino?: string, limite: number = 40): Promise<Paciente[]> {
    const filtro = termino && termino.trim().length > 0 ? `%${termino.trim().toUpperCase()}%` : null;

    const selectFields = `
      p.id AS id_persona,
      COALESCE(p.ci, '') AS ci,
      COALESCE(p.matricula_seguro, '') AS matricula,
      TRIM(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) AS nombre_completo,
      TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
      COALESCE(p.sexo, '') AS sexo,
      COALESCE(ta.tipo_asegurado, 'NO ASEGURADO') AS tipo_asegurado,
      COALESCE(p.afiliado, true) AS estado,
      CASE 
        -- 1. ESTUDIANTE
        WHEN p.id_tipo_asegurado = 11 OR UPPER(COALESCE(ta.tipo_asegurado, '')) LIKE '%ESTUDIANTE%' 
          THEN 'APORTE UMSA ESTUDIANTE'

        -- 2. INTERIOR
        WHEN p.id_tipo_asegurado IN (9, 10) OR UPPER(COALESCE(ta.tipo_asegurado, '')) LIKE '%INTERIOR%' 
          THEN 'SEGURO SOCIAL UNIVERSITARIO DEL INTERIOR'

        -- 3. BENEFICIARIOS
        WHEN UPPER(COALESCE(ta.tipo_asegurado, '')) LIKE '%BENEFICIARIO%' 
          THEN COALESCE(
            (
              SELECT inst.nombre
              FROM afiliacion.beneficiario b
              JOIN afiliacion.titular t ON t.id = b.id_titular
              JOIN afiliacion.titular_institucion ti ON ti.id_titular = t.id AND ti.estado = true
              JOIN aportes.institucion inst ON inst.id = ti.id_institucion
              WHERE b.id_persona = p.id
              ORDER BY 
                (CASE WHEN UPPER(COALESCE(ti.tipo_institucion, '')) = 'PATRONAL' THEN 1 ELSE 2 END) ASC,
                (CASE WHEN ti.fecha_baja IS NULL THEN 1 ELSE 2 END) ASC,
                ti.updated_at DESC NULLS LAST
              LIMIT 1
            ),
            (
              SELECT inst.nombre 
              FROM afiliacion.beneficiario b
              JOIN afiliacion.beneficiario_institucion bi ON bi.id_beneficiario = b.id AND bi.estado = true
              JOIN aportes.institucion inst ON inst.id = bi.id_institucion
              WHERE b.id_persona = p.id
              ORDER BY bi.id ASC
              LIMIT 1
            ),
            'PARTICULAR / SIN INSTITUCIÓN'
          )

        -- 4. TITULARES
        WHEN UPPER(COALESCE(ta.tipo_asegurado, '')) LIKE '%TITULAR%' 
          THEN COALESCE(
            (
              SELECT inst.nombre 
              FROM afiliacion.titular t
              JOIN afiliacion.titular_institucion ti ON ti.id_titular = t.id AND ti.estado = true
              JOIN aportes.institucion inst ON inst.id = ti.id_institucion
              WHERE t.id_persona = p.id
              ORDER BY 
                (CASE WHEN UPPER(COALESCE(ti.tipo_institucion, '')) = 'PATRONAL' THEN 1 ELSE 2 END) ASC,
                (CASE WHEN ti.fecha_baja IS NULL THEN 1 ELSE 2 END) ASC,
                ti.updated_at DESC NULLS LAST
              LIMIT 1
            ),
            'PARTICULAR / SIN INSTITUCIÓN'
          )

        ELSE 'PARTICULAR / SIN INSTITUCIÓN'
      END AS institucion
    `;

    const query = filtro
      ? `
        SELECT ${selectFields}
        FROM administracion.persona p
        LEFT JOIN administracion.tipo_asegurado ta ON ta.id = p.id_tipo_asegurado
        WHERE (
          UPPER(COALESCE(p.ci, '')) LIKE $1
          OR UPPER(COALESCE(p.matricula_seguro, '')) LIKE $1
          OR UPPER(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) LIKE $1
        )
        ORDER BY p.p_apellido ASC, p.nombres ASC
        LIMIT $2;
      `
      : `
        SELECT ${selectFields}
        FROM administracion.persona p
        LEFT JOIN administracion.tipo_asegurado ta ON ta.id = p.id_tipo_asegurado
        ORDER BY p.id DESC
        LIMIT $1;
      `;

    const params = filtro ? [filtro, limite] : [limite];
    const rows = await this.dataSource.query(query, params);

    return rows.map(
      (r: any) =>
        new Paciente(
          r.id_persona,
          r.ci,
          r.matricula,
          r.nombre_completo,
          r.fecha_nacimiento,
          r.sexo,
          r.tipo_asegurado,
          r.estado,
          r.institucion,
        ),
    );
  }

  async listarPacientesAdministracion(limite: number = 50): Promise<any[]> {
    try {
      const query = `
        SELECT 
          p.nombres,
          p.p_apellido,
          p.s_apellido,
          COALESCE(p.matricula_seguro, '') AS matricula_seguro,
          COALESCE(p.sexo, '') AS sexo,
          TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
          COALESCE(p.ci, '') AS ci,
          p.complemento,
          CASE WHEN p.es_extranjero = true THEN 'extranjero' ELSE 'nacional' END AS nacionalidad,
          COALESCE(t.telefono, b.telefono, e.telefono, 0)::bigint AS telefono,
          COALESCE(r.direccion, '') AS residencia
        FROM administracion.persona p
        LEFT JOIN afiliacion.titular t ON t.id_persona = p.id
        LEFT JOIN afiliacion.beneficiario b ON b.id_persona = p.id
        LEFT JOIN afiliacion.estudiante e ON e.id_persona = p.id
        LEFT JOIN administracion.residencia r ON r.id = COALESCE(t.id_residencia, b.id_residencia, e.id_residencia)
        WHERE p.ci IS NOT NULL AND p.ci != ''
        ORDER BY p.id DESC
        LIMIT $1;
      `;

      const rows = await this.dataSource.query(query, [limite]);
      return rows.map((r: any) => ({
        nombres: r.nombres || '',
        p_apellido: r.p_apellido || '',
        s_apellido: r.s_apellido || '',
        matricula_seguro: r.matricula_seguro || '',
        sexo: r.sexo || '',
        fecha_nacimiento: r.fecha_nacimiento || '',
        ci: r.ci || '',
        complemento: r.complemento || null,
        nacionalidad: r.nacionalidad,
        telefono: Number(r.telefono) || 0,
        residencia: r.residencia || '',
      }));
    } catch {
      const queryMinima = `
        SELECT 
          p.nombres,
          p.p_apellido,
          p.s_apellido,
          COALESCE(p.matricula_seguro, '') AS matricula_seguro,
          COALESCE(p.sexo, '') AS sexo,
          TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
          COALESCE(p.ci, '') AS ci,
          p.complemento
        FROM administracion.persona p
        WHERE p.ci IS NOT NULL AND p.ci != ''
        ORDER BY p.id DESC
        LIMIT $1;
      `;
      const rowsM = await this.dataSource.query(queryMinima, [limite]);
      return rowsM.map((r: any) => ({
        nombres: r.nombres || '',
        p_apellido: r.p_apellido || '',
        s_apellido: r.s_apellido || '',
        matricula_seguro: r.matricula_seguro || '',
        sexo: r.sexo || '',
        fecha_nacimiento: r.fecha_nacimiento || '',
        ci: r.ci || '',
        complemento: r.complemento || null,
        nacionalidad: 'nacional',
        telefono: 0,
        residencia: '',
      }));
    }
  }
}