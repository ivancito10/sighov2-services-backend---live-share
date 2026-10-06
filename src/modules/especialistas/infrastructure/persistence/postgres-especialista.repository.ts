import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource, ILike } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { EspecialistaRepositoryPort } from '../../domain/ports/especialista.repository.port';
import type { ConsultaEspecialistas } from '../../domain/ports/especialista.repository.port';
import {
    especialistasQuery,
    buscarPersona,
    mapEspecialista,
    patron,
} from '../../../../common/persistence/orm/lecturas';
@Injectable()
export class PostgresEspecialistaRepository implements EspecialistaRepositoryPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly db: DataSource,
    ) {}
    async listarActivos(c: ConsultaEspecialistas) {
        const q = especialistasQuery(this.db).where({ estado: true });
        if (c.buscar.trim())
            q.andWhere(
                new Brackets((b) => {
                    b.where({
                        especialidad: { nombre: ILike(patron(c.buscar)) },
                    });
                    b.orWhere(
                        new Brackets((p) => {
                            buscarPersona(p, c.buscar, true);
                        }),
                    );
                }),
            );
        if (c.idEspecialidad !== undefined)
            q.andWhere({ idEspecialidad: c.idEspecialidad });
        if (c.especialidad)
            q.andWhere([
                { especialidad: { nombre: ILike(patron(c.especialidad)) } },
                { especialidad: { sigla: ILike(patron(c.especialidad)) } },
            ]);
        const [rows, total] = await q
            .orderBy('p.primerApellido', 'ASC', 'NULLS LAST')
            .addOrderBy('p.segundoApellido', 'ASC', 'NULLS LAST')
            .addOrderBy('p.nombres', 'ASC')
            .addOrderBy('e.id', 'ASC')
            .skip((c.pagina - 1) * c.limite)
            .take(c.limite)
            .getManyAndCount();
        return { datos: rows.map(mapEspecialista), total };
    }
    async buscarPorId(id: number) {
        const row = await especialistasQuery(this.db).where({ id }).getOne();
        return row ? mapEspecialista(row) : null;
    }
}