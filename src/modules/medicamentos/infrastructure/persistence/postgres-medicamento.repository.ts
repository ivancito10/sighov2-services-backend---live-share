import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { MedicamentoRepositoryPort } from '../../domain/ports/medicamento.repository.port';
import { Medicamento } from '../../domain/entities/medicamento.entity';

@Injectable()
export class PostgresMedicamentoRepository implements MedicamentoRepositoryPort {
  constructor(
    @InjectDataSource(DB_CONNECTIONS.ETAPA2) // <-- Debe ser ETAPA2
    private readonly dataSource: DataSource,
  ) { }

  async buscarMedicamentos(termino?: string, limite: number = 40): Promise<Medicamento[]> {
    const filtro = termino && termino.trim().length > 0 ? `%${termino.trim().toUpperCase()}%` : null;

    const query = filtro
      ? `
        SELECT 
          m.id AS id_medicamento,
          COALESCE(m.codigo_medicamento, '') AS codigo,
          m.nombre,
          COALESCE(m.concentracion, '') AS concentracion,
          COALESCE(m.forma_farmaceutica, '') AS forma_farmaceutica,
          '' AS presentacion,
          m.estado
        FROM farmacia.medicamento m
        WHERE (
          UPPER(COALESCE(m.codigo_medicamento, '')) LIKE $1 
          OR UPPER(m.nombre) LIKE $1
        )
        ORDER BY m.id DESC
        LIMIT $2;
      `
      : `
        SELECT 
          m.id AS id_medicamento,
          COALESCE(m.codigo_medicamento, '') AS codigo,
          m.nombre,
          COALESCE(m.concentracion, '') AS concentracion,
          COALESCE(m.forma_farmaceutica, '') AS forma_farmaceutica,
          '' AS presentacion,
          m.estado
        FROM farmacia.medicamento m
        ORDER BY m.id DESC
        LIMIT $1;
      `;

    const params = filtro ? [filtro, limite] : [limite];
    const rows = await this.dataSource.query(query, params);

    return rows.map((r: any) => new Medicamento(
      r.id_medicamento,
      r.codigo,
      r.nombre,
      r.concentracion,
      r.forma_farmaceutica,
      r.presentacion,
      r.estado,
    ));
  }

  async buscarPorId(idMedicamento: number): Promise<Medicamento | null> {
    const query = `
      SELECT 
        m.id AS id_medicamento,
        COALESCE(m.codigo_medicamento, '') AS codigo,
        m.nombre,
        COALESCE(m.concentracion, '') AS concentracion,
        COALESCE(m.forma_farmaceutica, '') AS forma_farmaceutica,
        '' AS presentacion,
        m.estado
      FROM farmacia.medicamento m
      WHERE m.id = $1
      LIMIT 1;
    `;

    const rows = await this.dataSource.query(query, [idMedicamento]);
    if (!rows || rows.length === 0) return null;

    const r = rows[0];
    return new Medicamento(
      r.id_medicamento,
      r.codigo,
      r.nombre,
      r.concentracion,
      r.forma_farmaceutica,
      r.presentacion,
      r.estado,
    );
  }
}