import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { RecetaManualRepositoryPort } from '../../domain/ports/receta-manual.repository.port';
import { RecetaManual } from '../../domain/entities/receta-manual.entity';

@Injectable()
export class PostgresRecetaManualRepository implements RecetaManualRepositoryPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.ETAPA2)
        private readonly dataSource: DataSource,
    ) { }

    async crear(data: {
        idPersona: number;
        idEspecialista?: number | null;
        idMedicamento: number;
        fechaReceta: string;
        idUserCreated?: number | null;
    }): Promise<RecetaManual> {
        const query = `
      INSERT INTO enfermeria.receta_manual (
        id_persona,
        id_especialista,
        id_medicamento,
        fecha_receta,
        estado,
        id_user_created,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
      RETURNING id, id_persona, id_especialista, id_medicamento, fecha_receta, estado, id_user_created, id_user_updated, created_at, updated_at;
    `;

        const rows = await this.dataSource.query(query, [
            data.idPersona,
            data.idEspecialista ?? null,
            data.idMedicamento,
            data.fechaReceta,
            data.idUserCreated ?? null,
        ]);

        const r = rows[0];
        return new RecetaManual(
            r.id,
            r.id_persona,
            r.id_especialista,
            r.id_medicamento,
            r.fecha_receta,
            r.estado,
            r.id_user_created,
            r.id_user_updated,
            r.created_at,
            r.updated_at,
        );
    }

    async buscarPorPaciente(idPersona: number): Promise<RecetaManual[]> {
        const query = `
      SELECT id, id_persona, id_especialista, id_medicamento, fecha_receta, estado, id_user_created, id_user_updated, created_at, updated_at
      FROM enfermeria.receta_manual
      WHERE id_persona = $1 AND estado = true
      ORDER BY fecha_receta DESC, created_at DESC;
    `;

        const rows = await this.dataSource.query(query, [idPersona]);
        return rows.map(
            (r: any) =>
                new RecetaManual(
                    r.id,
                    r.id_persona,
                    r.id_especialista,
                    r.id_medicamento,
                    r.fecha_receta,
                    r.estado,
                    r.id_user_created,
                    r.id_user_updated,
                    r.created_at,
                    r.updated_at,
                ),
        );
    }

    async buscarPorId(id: number): Promise<RecetaManual | null> {
        const query = `
      SELECT id, id_persona, id_especialista, id_medicamento, fecha_receta, estado, id_user_created, id_user_updated, created_at, updated_at
      FROM enfermeria.receta_manual
      WHERE id = $1 AND estado = true
      LIMIT 1;
    `;

        const rows = await this.dataSource.query(query, [id]);
        if (!rows || rows.length === 0) return null;

        const r = rows[0];
        return new RecetaManual(
            r.id,
            r.id_persona,
            r.id_especialista,
            r.id_medicamento,
            r.fecha_receta,
            r.estado,
            r.id_user_created,
            r.id_user_updated,
            r.created_at,
            r.updated_at,
        );
    }
}