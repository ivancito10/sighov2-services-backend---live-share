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
      const valorBuscado = numeroReceta.trim();

      // 1. OBTENER LA CABECERA (Priorizando nro_receta exacto)
      const queryReceta = `
        SELECT 
          r.id AS id_receta,
          COALESCE(r.nro_receta::text, r.id::text) AS numero_receta,
          COALESCE(r.fecha_transcripcion, r.created_at, NOW()) AS fecha_emision,
          r.id_persona,
          r.id_especialista
        FROM consulta_externa.receta r
        WHERE r.nro_receta::text = $1 OR r.id::text = $1
        ORDER BY (CASE WHEN r.nro_receta::text = $1 THEN 1 ELSE 2 END) ASC
        LIMIT 1;
      `;

      const rowsReceta = await this.dsEtapa2.query(queryReceta, [valorBuscado]);
      if (!rowsReceta || rowsReceta.length === 0) {
        return null;
      }
      const rec = rowsReceta[0];

      // 2. OBTENER DETALLE DE MEDICAMENTOS DESDE ETAPA 1
      let detallesRows: any[] = [];
      try {
        const queryDetalle = `
          SELECT 
            rm.id AS id_detalle,
            rm.id_medicamento,
            COALESCE(rm.cantidad, 1) AS cantidad,
            COALESCE(rm.indicaciones, rm.recomendacion, '') AS indicaciones,
            COALESCE(rm.forma_adm, '') AS via_sugerida
          FROM consulta_externa.receta_medicamento rm
          WHERE rm.id_receta = $1;
        `;
        detallesRows = await this.dsEtapa2.query(queryDetalle, [Number(rec.id_receta)]);

        // Si hay medicamentos, buscamos sus nombres en SIGHOV (Etapa 1)
        if (detallesRows.length > 0) {
          const idsMedicamentos = detallesRows.map((d: any) => d.id_medicamento).filter(Boolean);

          if (idsMedicamentos.length > 0) {
            try {
              // Consulta al catálogo de medicamentos en Etapa 1
              const qMeds = `
                SELECT 
                  m.id, 
                  COALESCE(m.codigo, m.codigo_medicamento, '') AS codigo_medicamento, 
                  COALESCE(m.nombre, m.descripcion, 'Medicamento') AS nombre_medicamento
                FROM farmacia.medicamento m
                WHERE m.id = ANY($1);
              `;
              const rowsMeds = await this.dsSighov.query(qMeds, [idsMedicamentos]);

              // Unimos los nombres con los detalles tipando con any
              const mapaNombres = new Map<number, any>(
                (rowsMeds || []).map((m: any) => [Number(m.id), m]),
              );

              detallesRows = detallesRows.map((d: any) => {
                const infoMed: any = mapaNombres.get(Number(d.id_medicamento));
                return {
                  ...d,
                  codigo_medicamento: infoMed?.codigo_medicamento || '',
                  nombre_medicamento: infoMed?.nombre_medicamento || 'Medicamento',
                };
              });
            } catch (errMedCatalog: any) {
              this.logger.warn(`No se pudo leer catálogo de medicamentos desde Etapa 1: ${errMedCatalog?.message}`);
            }
          }
        }
      } catch (errDet: any) {
        this.logger.error(`Error leyendo consulta_externa.receta_medicamento: ${errDet?.message}`);
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
      const medicamentos = (detallesRows || []).map(
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