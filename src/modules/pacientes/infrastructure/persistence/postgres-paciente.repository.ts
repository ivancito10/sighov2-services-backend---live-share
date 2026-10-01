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

  async buscarPacientes(termino?: string, limite: number = 40): Promise<Paciente[]> {
    const filtro = termino && termino.trim().length > 0 ? `%${termino.trim().toUpperCase()}%` : null;

    const query = filtro
      ? `
        SELECT 
          p.id AS id_persona,
          COALESCE(p.ci, '') AS ci,
          COALESCE(p.matricula_seguro, '') AS matricula,
          TRIM(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) AS nombre_completo,
          TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
          COALESCE(p.sexo, '') AS sexo,
          CASE 
            WHEN p.afiliado = false THEN 'NO ASEGURADO'
            WHEN p.id_tipo_asegurado = 1 THEN 'TITULAR'
            WHEN p.id_tipo_asegurado = 2 THEN 'BENEFICIARIO'
            WHEN p.id_tipo_asegurado = 3 THEN 'ESTUDIANTE'
            ELSE 'TITULAR'
          END AS tipo_asegurado,
          COALESCE(p.afiliado, true) AS estado
        FROM administracion.persona p
        WHERE (
          UPPER(COALESCE(p.ci, '')) LIKE $1
          OR UPPER(COALESCE(p.matricula_seguro, '')) LIKE $1
          OR UPPER(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) LIKE $1
        )
        ORDER BY p.p_apellido ASC, p.nombres ASC
        LIMIT $2;
      `
      : `
        SELECT 
          p.id AS id_persona,
          COALESCE(p.ci, '') AS ci,
          COALESCE(p.matricula_seguro, '') AS matricula,
          TRIM(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) AS nombre_completo,
          TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
          COALESCE(p.sexo, '') AS sexo,
          CASE 
            WHEN p.afiliado = false THEN 'NO ASEGURADO'
            WHEN p.id_tipo_asegurado = 1 THEN 'TITULAR'
            WHEN p.id_tipo_asegurado = 2 THEN 'BENEFICIARIO'
            WHEN p.id_tipo_asegurado = 3 THEN 'ESTUDIANTE'
            ELSE 'TITULAR'
          END AS tipo_asegurado,
          COALESCE(p.afiliado, true) AS estado
        FROM administracion.persona p
        ORDER BY p.id DESC
        LIMIT $1;
      `;

    const params = filtro ? [filtro, limite] : [limite];
    const rows = await this.dataSource.query(query, params);

    return rows.map((r: any) => new Paciente(
      r.id_persona,
      r.ci,
      r.matricula,
      r.nombre_completo,
      r.fecha_nacimiento,
      r.sexo,
      r.tipo_asegurado,
      r.estado,
    ));
  }

  async buscarPorId(idPersona: number): Promise<Paciente | null> {
    const query = `
      SELECT 
        p.id AS id_persona,
        COALESCE(p.ci, '') AS ci,
        COALESCE(p.matricula_seguro, '') AS matricula,
        TRIM(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) AS nombre_completo,
        TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
        COALESCE(p.sexo, '') AS sexo,
        CASE 
          WHEN p.afiliado = false THEN 'NO ASEGURADO'
          WHEN p.id_tipo_asegurado = 1 THEN 'TITULAR'
          WHEN p.id_tipo_asegurado = 2 THEN 'BENEFICIARIO'
          WHEN p.id_tipo_asegurado = 3 THEN 'ESTUDIANTE'
          ELSE 'TITULAR'
        END AS tipo_asegurado,
        COALESCE(p.afiliado, true) AS estado
      FROM administracion.persona p
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
    );
  }

  // Conservamos el método de compatibilidad con Laravel
  async listarPacientesAdministracion(limite: number = 50): Promise<any[]> {
    try {
      // 1. Intentamos consultar uniendo persona con titular/beneficiario y residencia
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
        WHERE p.ci IS NOT NULL 
          AND p.ci != ''
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
    } catch (error: any) {
      // 2. Si falla por estructura de llaves, probamos desde la vista poblacion_asegurada
      try {
        const queryPoblacion = `
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
            COALESCE(pa.telefono, 0)::bigint AS telefono,
            COALESCE(pa.direccion_residencia, '') AS residencia
          FROM administracion.persona p
          LEFT JOIN administracion.poblacion_asegurada pa ON pa.ci = p.ci
          WHERE p.ci IS NOT NULL 
            AND p.ci != ''
          ORDER BY p.id DESC
          LIMIT $1;
        `;
        const rowsP = await this.dataSource.query(queryPoblacion, [limite]);
        return rowsP.map((r: any) => ({
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
      } catch (errPoblacion) {
        // 3. Fallback mínimo que no se rompe nunca
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
}