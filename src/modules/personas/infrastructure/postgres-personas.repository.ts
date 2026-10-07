import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../config/database.constants';
import { PersonaPort } from '../domain/persona';
import type { FiltroPersona } from '../domain/persona';
import {
    personasQuery,
    mapPersona,
} from '../../../common/persistence/orm/lecturas';
import { filtrarPersonas } from './filtros-personas';
@Injectable()
export class PostgresPersonasRepository implements PersonaPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly db: DataSource,
    ) {}
    async listar(f: FiltroPersona) {
        const [rows, total] = await filtrarPersonas(personasQuery(this.db), f)
            .orderBy('p.primerApellido', 'ASC', 'NULLS LAST')
            .addOrderBy('p.segundoApellido', 'ASC', 'NULLS LAST')
            .addOrderBy('p.nombres', 'ASC')
            .addOrderBy('p.id', 'ASC')
            .skip((f.pagina - 1) * f.limite)
            .take(f.limite)
            .getManyAndCount();
        return { datos: rows.map(mapPersona), total };
    }
    async obtener(id: string) {
        const row = await personasQuery(this.db)
            .where({ id: Number(id) })
            .getOne();
        return row ? mapPersona(row) : null;
    }
}