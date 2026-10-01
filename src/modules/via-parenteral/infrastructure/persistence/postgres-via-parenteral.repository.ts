import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants'; // <-- Importa la constante
import { ViaParenteralRepositoryPort } from '../../domain/ports/via-parenteral.repository.port';
import { ViaParenteral } from '../../domain/entities/via-parenteral.entity';

@Injectable()
export class PostgresViaParenteralRepository implements ViaParenteralRepositoryPort {
  constructor(
    @InjectDataSource(DB_CONNECTIONS.ETAPA2) // <-- Usa DB_CONNECTIONS.ETAPA2
    private readonly dataSource: DataSource,
  ) {}

  async listarActivos(): Promise<ViaParenteral[]> {
    const query = `
      SELECT id, codigo, nombre, estado, id_user_created, id_user_updated, created_at, updated_at
      FROM enfermeria.via_parenteral
      WHERE estado = true
      ORDER BY nombre ASC;
    `;
    const rows = await this.dataSource.query(query);
    return rows.map(
      (r: any) =>
        new ViaParenteral(
          r.id,
          r.codigo,
          r.nombre,
          r.estado,
          r.id_user_created,
          r.id_user_updated,
          r.created_at,
          r.updated_at,
        ),
    );
  }

  async listarTodos(): Promise<ViaParenteral[]> {
    const query = `
      SELECT id, codigo, nombre, estado, id_user_created, id_user_updated, created_at, updated_at
      FROM enfermeria.via_parenteral
      ORDER BY id ASC;
    `;
    const rows = await this.dataSource.query(query);
    return rows.map(
      (r: any) =>
        new ViaParenteral(
          r.id,
          r.codigo,
          r.nombre,
          r.estado,
          r.id_user_created,
          r.id_user_updated,
          r.created_at,
          r.updated_at,
        ),
    );
  }

  async buscarPorId(id: number): Promise<ViaParenteral | null> {
    const query = `
      SELECT id, codigo, nombre, estado, id_user_created, id_user_updated, created_at, updated_at
      FROM enfermeria.via_parenteral
      WHERE id = $1
      LIMIT 1;
    `;
    const rows = await this.dataSource.query(query, [id]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return new ViaParenteral(
      r.id,
      r.codigo,
      r.nombre,
      r.estado,
      r.id_user_created,
      r.id_user_updated,
      r.created_at,
      r.updated_at,
    );
  }

  async buscarPorCodigo(codigo: string): Promise<ViaParenteral | null> {
    const query = `
      SELECT id, codigo, nombre, estado, id_user_created, id_user_updated, created_at, updated_at
      FROM enfermeria.via_parenteral
      WHERE UPPER(codigo) = UPPER($1)
      LIMIT 1;
    `;
    const rows = await this.dataSource.query(query, [codigo]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return new ViaParenteral(
      r.id,
      r.codigo,
      r.nombre,
      r.estado,
      r.id_user_created,
      r.id_user_updated,
      r.created_at,
      r.updated_at,
    );
  }

  async crear(data: {
    codigo: string;
    nombre: string;
    idUserCreated?: number;
  }): Promise<ViaParenteral> {
    const query = `
      INSERT INTO enfermeria.via_parenteral (codigo, nombre, estado, id_user_created, created_at, updated_at)
      VALUES ($1, $2, true, $3, NOW(), NOW())
      RETURNING id, codigo, nombre, estado, id_user_created, id_user_updated, created_at, updated_at;
    `;
    const rows = await this.dataSource.query(query, [
      data.codigo,
      data.nombre,
      data.idUserCreated ?? null,
    ]);
    const r = rows[0];
    return new ViaParenteral(
      r.id,
      r.codigo,
      r.nombre,
      r.estado,
      r.id_user_created,
      r.id_user_updated,
      r.created_at,
      r.updated_at,
    );
  }

  async actualizar(
    id: number,
    data: { codigo?: string; nombre?: string; idUserUpdated?: number },
  ): Promise<ViaParenteral | null> {
    const query = `
      UPDATE enfermeria.via_parenteral
      SET 
        codigo = COALESCE($1, codigo),
        nombre = COALESCE($2, nombre),
        id_user_updated = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, codigo, nombre, estado, id_user_created, id_user_updated, created_at, updated_at;
    `;
    const rows = await this.dataSource.query(query, [
      data.codigo ?? null,
      data.nombre ?? null,
      data.idUserUpdated ?? null,
      id,
    ]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return new ViaParenteral(
      r.id,
      r.codigo,
      r.nombre,
      r.estado,
      r.id_user_created,
      r.id_user_updated,
      r.created_at,
      r.updated_at,
    );
  }

  async cambiarEstado(id: number, estado: boolean, idUserUpdated?: number): Promise<boolean> {
    const query = `
      UPDATE enfermeria.via_parenteral
      SET estado = $1, id_user_updated = $2, updated_at = NOW()
      WHERE id = $3;
    `;
    const result = await this.dataSource.query(query, [estado, idUserUpdated ?? null, id]);
    return result[1] > 0;
  }
}