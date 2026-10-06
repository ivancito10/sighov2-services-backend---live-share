import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../config/database.constants';
import { SedePort } from '../domain/sede';
import type { FiltroSede, SedeBase } from '../domain/sede';

const columnas =
    's.id,s.ubicacion,s.piso,s.id_residencia,r.direccion AS residencia';
const tablas =
    'FROM plataforma.sedes s LEFT JOIN administracion.residencia r ON r.id=s.id_residencia';
@Injectable()
export class PostgresSedesRepository implements SedePort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly db: DataSource,
    ) {}
    async listar(f: FiltroSede) {
        const patron = '%' + f.buscar.replace(/[\\%_]/g, '\\$&') + '%';
        const where = `WHERE s.id::text ILIKE $1 OR COALESCE(s.piso,'') ILIKE $1 OR COALESCE(s.ubicacion,'') ILIKE $1 OR COALESCE(r.direccion,'') ILIKE $1`;
        const [datos, cuenta] = await Promise.all([
            this.db.query<SedeBase[]>(
                `SELECT ${columnas} ${tablas} ${where} ORDER BY s.id LIMIT $2 OFFSET $3`,
                [patron, f.limite, (f.pagina - 1) * f.limite],
            ),
            this.db.query<{ total: string }[]>(
                `SELECT COUNT(*)::text AS total ${tablas} ${where}`,
                [patron],
            ),
        ]);
        return { datos, total: Number(cuenta[0].total) };
    }
    async obtener(id: string) {
        const rows = await this.db.query<SedeBase[]>(
            `SELECT ${columnas} ${tablas} WHERE s.id=$1`,
            [id],
        );
        return rows[0] ?? null;
    }
}
