import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ILike } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { DB_CONNECTIONS } from '../../../config/database.constants';
import { SedePort } from '../domain/sede';
import type { FiltroSede } from '../domain/sede';
import { SedeOrm } from '../../../common/persistence/orm/entities';
import type { SedeRow } from '../../../common/persistence/orm/entities';
import { patron } from '../../../common/persistence/orm/lecturas';
const map = (s: SedeRow) => ({
    id: s.id,
    piso: s.piso,
    ubicacion: s.ubicacion,
    id_residencia: s.idResidencia,
    residencia: s.residencia?.direccion ?? null,
});
@Injectable()
export class PostgresSedesRepository implements SedePort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly db: DataSource,
    ) {}
    async listar(f: FiltroSede) {
        const value = ILike(patron(f.buscar));
        const where: FindOptionsWhere<SedeRow>[] = [
            { piso: value },
            { ubicacion: value },
            { residencia: { direccion: value } },
        ];
        if (/^\d+$/.test(f.buscar) && Number(f.buscar) <= 2147483647)
            where.push({ id: Number(f.buscar) });
        const [rows, total] = await this.db
            .getRepository(SedeOrm)
            .findAndCount({
                relations: { residencia: true },
                where: f.buscar ? where : {},
                order: { id: 'ASC' },
                skip: (f.pagina - 1) * f.limite,
                take: f.limite,
            });
        return { datos: rows.map(map), total };
    }
    async obtener(id: string) {
        const row = await this.db.getRepository(SedeOrm).findOne({
            where: { id: Number(id) },
            relations: { residencia: true },
        });
        return row ? map(row) : null;
    }
}
