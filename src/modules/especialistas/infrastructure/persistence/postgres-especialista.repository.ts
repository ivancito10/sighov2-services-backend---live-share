import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { EspecialistaRepositoryPort } from '../../domain/ports/especialista.repository.port';
import { Especialista } from '../../domain/entities/especialista.entity';

@Injectable()
export class PostgresEspecialistaRepository implements EspecialistaRepositoryPort {
  constructor(
    @InjectDataSource(DB_CONNECTIONS.SIGHOV)
    private readonly dataSource: DataSource,
  ) { }

  // 1. GET /api/s1/plataforma/listar_especialistas_habilitados
  async listarHabilitados(): Promise<any[]> {
    const query = `
      SELECT 
        id,
        fecha_contrato_inicio,
        fecha_contrato_fin,
        foto,
        permanente,
        estado,
        id_especialidad,
        id_persona,
        id_user_created,
        id_user_updated,
        created_at,
        updated_at,
        grado_academico,
        afiliados,
        estudiantes,
        convenios,
        externo,
        especialista_imagenologia
      FROM plataforma.especialista
      WHERE estado = true
      ORDER BY id ASC;
    `;
    return await this.dataSource.query(query);
  }

  // 2. GET /api/s1/plataforma/obtener_datos_especialista/:id
  async obtenerDatosEspecialista(idEspecialista: number): Promise<any | null> {
    // A. Obtener datos del especialista
    const qEsp = `
      SELECT 
        id,
        fecha_contrato_inicio,
        fecha_contrato_fin,
        foto,
        permanente,
        estado,
        id_especialidad,
        id_persona,
        id_user_created,
        id_user_updated,
        created_at,
        updated_at,
        grado_academico,
        afiliados,
        estudiantes,
        convenios,
        externo,
        especialista_imagenologia
      FROM plataforma.especialista
      WHERE id = $1
      LIMIT 1;
    `;
    const rowsEsp = await this.dataSource.query(qEsp, [idEspecialista]);
    if (!rowsEsp || rowsEsp.length === 0) return null;

    const especialista = rowsEsp[0];

    // B. Obtener datos de la persona anidada (persona_especialista)
    let personaEspecialista: any = null;
    if (especialista.id_persona) {
      const qPer = `
        SELECT 
          id,
          complemento,
          nombres,
          p_apellido,
          s_apellido,
          sexo,
          id_estado_civil,
          id_nacimiento_municipio,
          id_dept_exp,
          fecha_nacimiento,
          matricula_seguro,
          id_tipo_asegurado,
          es_extranjero,
          estado_asuss,
          afiliado,
          id_user_created,
          id_user_updated,
          created_at,
          updated_at,
          clave_unica,
          grupo_sanguineo,
          alergias,
          ci,
          excepcion,
          migracion_etp3,
          observaciones
        FROM administracion.persona
        WHERE id = $1
        LIMIT 1;
      `;
      const rowsPer = await this.dataSource.query(qPer, [especialista.id_persona]);
      if (rowsPer && rowsPer.length > 0) {
        personaEspecialista = rowsPer[0];
      }
    }

    // C. Obtener datos de la especialidad anidada (especialidad_especialista)
    let especialidadEspecialista: any = null;
    if (especialista.id_especialidad) {
      const qEspData = `
        SELECT 
          id,
          especialidad,
          sigla,
          id_user_created,
          id_user_updated,
          created_at,
          updated_at,
          estado,
          estudiantes,
          externo,
          especialidad_imagenologia
        FROM administracion.especialidad
        WHERE id = $1
        LIMIT 1;
      `;
      const rowsEspData = await this.dataSource.query(qEspData, [especialista.id_especialidad]);
      if (rowsEspData && rowsEspData.length > 0) {
        especialidadEspecialista = rowsEspData[0];
      }
    }

    return {
      ...especialista,
      persona_especialista: personaEspecialista,
      especialidad_especialista: especialidadEspecialista,
    };
  }

  // Métodos internos que necesita la entidad Especialista para Enfermería
  async listarActivos(termino?: string, limite: number = 60): Promise<Especialista[]> {
    const query = `
      SELECT 
        e.id AS id_especialista,
        p.id AS id_persona,
        TRIM(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) AS nombre_completo,
        COALESCE(esp.especialidad, esp.sigla, 'MEDICINA GENERAL') AS especialidad,
        '' AS matricula_colegio,
        e.estado
      FROM plataforma.especialista e
      INNER JOIN administracion.persona p ON p.id = e.id_persona
      LEFT JOIN administracion.especialidad esp ON esp.id = e.id_especialidad
      WHERE e.estado = true
      ORDER BY p.p_apellido ASC, p.nombres ASC
      LIMIT $1;
    `;
    const rows = await this.dataSource.query(query, [limite]);
    return rows.map(
      (r: any) =>
        new Especialista(
          r.id_especialista,
          r.id_persona,
          r.nombre_completo,
          r.especialidad,
          r.matricula_colegio,
          r.estado,
        ),
    );
  }

  async buscarPorId(idEspecialista: number): Promise<Especialista | null> {
    const raw = await this.obtenerDatosEspecialista(idEspecialista);
    if (!raw) return null;

    const nombreCompleto = raw.persona_especialista
      ? `${raw.persona_especialista.nombres} ${raw.persona_especialista.p_apellido} ${raw.persona_especialista.s_apellido || ''}`.trim()
      : 'ESPECIALISTA';

    const especialidad = raw.especialidad_especialista?.especialidad || 'MEDICINA GENERAL';

    return new Especialista(
      raw.id,
      raw.id_persona,
      nombreCompleto,
      especialidad,
      '',
      raw.estado,
    );
  }
}