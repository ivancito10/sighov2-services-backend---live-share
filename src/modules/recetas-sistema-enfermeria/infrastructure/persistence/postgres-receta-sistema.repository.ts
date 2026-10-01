import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { RecetaSistemaRepositoryPort } from '../../domain/ports/receta-sistema.repository.port';
import { RecetaSistema } from '../../domain/entities/receta-sistema.entity';
import { RecetaSistemaMedicamento } from '../../domain/entities/receta-sistema-medicamento.entity';

@Injectable()
export class PostgresRecetaSistemaRepository implements RecetaSistemaRepositoryPort {
  private readonly logger = new Logger(PostgresRecetaSistemaRepository.name);

  constructor(
    @InjectDataSource(DB_CONNECTIONS.ETAPA2)
    private readonly dsEtapa2: DataSource,
    @InjectDataSource(DB_CONNECTIONS.SIGHOV)
    private readonly dsSighov: DataSource,
  ) { }

  async buscarPorNumero(numeroReceta: string): Promise<RecetaSistema | null> {
    try {
      // 1. OBTENER LA CABECERA DE LA RECETA DESDE ETAPA 2
      const queryReceta = `
        SELECT 
          r.id AS id_receta,
          COALESCE(r.nro_receta::text, r.id::text) AS numero_receta,
          COALESCE(r.fecha_transcripcion, r.created_at, NOW()) AS fecha_emision,
          r.id_persona,
          r.id_especialista
        FROM consulta_externa.receta r
        WHERE (r.nro_receta::text = $1 OR r.id::text = $1)
        LIMIT 1;
      `;

      const rowsReceta = await this.dsEtapa2.query(queryReceta, [numeroReceta]);
      if (!rowsReceta || rowsReceta.length === 0) {
        return null;
      }
      const rec = rowsReceta[0];

      // 2. OBTENER DETALLE DE MEDICAMENTOS DESDE ETAPA 2
      let detallesRows: any[] = [];
      try {
        const queryDetalle = `
          SELECT 
            rd.id AS id_detalle,
            rd.id_medicamento,
            COALESCE(m.codigo_medicamento, '') AS codigo_medicamento,
            COALESCE(m.nombre, 'Medicamento') AS nombre_medicamento,
            COALESCE(rd.cantidad, 1) AS cantidad,
            COALESCE(rd.indicaciones, rd.recomendacion, '') AS indicaciones,
            COALESCE(rd.forma_adm, '') AS via_sugerida
          FROM farmacia.receta_detalle rd
          LEFT JOIN farmacia.medicamento m ON m.id = rd.id_medicamento
          WHERE rd.id_receta = $1;
        `;
        detallesRows = await this.dsEtapa2.query(queryDetalle, [rec.id_receta]);
      } catch (errDet: any) {
        this.logger.warn(`Error leyendo farmacia.receta_detalle: ${errDet?.message}`);
      }

      // 3. CONSULTAR DATOS DEL PACIENTE EN SIGHOV (Fase 1)
      let pacienteNombre = 'PACIENTE ASEGURADO';
      let pacienteCi = '';
      let pacienteMatricula = '';

      if (rec.id_persona) {
        try {
          const qPaciente = `
            SELECT 
              COALESCE(p.ci, '') AS ci,
              COALESCE(a.matricula, '') AS matricula,
              TRIM(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) AS nombre_completo
            FROM administracion.persona p
            LEFT JOIN afiliacion.asegurado a ON a.id_persona = p.id AND a.estado = true
            WHERE p.id = $1
            LIMIT 1;
          `;
          const pRows = await this.dsSighov.query(qPaciente, [rec.id_persona]);
          if (pRows && pRows.length > 0) {
            pacienteNombre = pRows[0].nombre_completo || pacienteNombre;
            pacienteCi = pRows[0].ci;
            pacienteMatricula = pRows[0].matricula;
          }
        } catch (e: any) {
          this.logger.warn(`No se pudo complementar paciente desde Fase 1: ${e?.message}`);
        }
      }

      // 4. CONSULTAR DATOS DEL ESPECIALISTA EN SIGHOV (Fase 1)
      let medicoNombre = 'MÉDICO TRATANTE';
      let especialidad = 'MEDICINA GENERAL';

      if (rec.id_especialista) {
        try {
          const qMedico = `
            SELECT 
              TRIM(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) AS nombre_completo,
              COALESCE(esp.nombre, 'MEDICINA GENERAL') AS especialidad
            FROM plataforma.especialista e
            INNER JOIN administracion.persona p ON p.id = e.id_persona
            LEFT JOIN parametro.especialidad esp ON esp.id = e.id_especialidad
            WHERE e.id = $1
            LIMIT 1;
          `;
          const mRows = await this.dsSighov.query(qMedico, [rec.id_especialista]);
          if (mRows && mRows.length > 0) {
            medicoNombre = mRows[0].nombre_completo || medicoNombre;
            especialidad = mRows[0].especialidad || especialidad;
          }
        } catch (e: any) {
          this.logger.warn(`No se pudo complementar médico desde Fase 1: ${e?.message}`);
        }
      }

      // 5. MAPEAR MEDICAMENTOS
      const medicamentos = detallesRows.map(
        (d: any) =>
          new RecetaSistemaMedicamento(
            d.id_detalle,
            d.id_medicamento,
            d.codigo_medicamento,
            d.nombre_medicamento,
            Number(d.cantidad),
            d.indicaciones,
            d.via_sugerida,
          ),
      );

      return new RecetaSistema(
        rec.id_receta,
        rec.numero_receta,
        rec.fecha_emision,
        rec.id_persona,
        pacienteNombre,
        pacienteCi,
        pacienteMatricula,
        rec.id_especialista,
        medicoNombre,
        especialidad,
        medicamentos,
      );
    } catch (error: any) {
      this.logger.error(`Error al buscar receta sistema: ${error?.message}`, error?.stack);
      return null;
    }
  }

  async buscarPorId(idReceta: number): Promise<RecetaSistema | null> {
    return await this.buscarPorNumero(idReceta.toString());
  }
}