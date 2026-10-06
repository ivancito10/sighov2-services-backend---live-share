import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { EspecialistaRepositoryPort } from '../../domain/ports/especialista.repository.port';
import type { ConsultaEspecialistas } from '../../domain/ports/especialista.repository.port';
import type { Especialista } from '../../domain/entities/especialista.entity';
import { listado, datosModal } from './especialista-select';

const base = `FROM plataforma.especialista e
    JOIN administracion.persona p ON p.id=e.id_persona
    LEFT JOIN administracion.departamento d ON d.id=p.id_dept_exp
    LEFT JOIN administracion.especialidad esp ON esp.id=e.id_especialidad`;
const patron = (s: string) => '%' + s.replace(/[\\%_]/g, '\\$&') + '%';

@Injectable()
export class PostgresEspecialistaRepository implements EspecialistaRepositoryPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly dataSource: DataSource,
    ) {}

    async listarActivos(c: ConsultaEspecialistas) {
        const from = `${base} WHERE e.estado=true
            AND (p.ci ILIKE $1 OR COALESCE(p.matricula_seguro,'') ILIKE $1
                OR CONCAT_WS(' ',p.nombres,p.p_apellido,p.s_apellido) ILIKE $1
                OR COALESCE(esp.especialidad,'') ILIKE $1)
            AND ($2::integer IS NULL OR e.id_especialidad=$2)
            AND ($3::text IS NULL OR esp.especialidad ILIKE $3 OR esp.sigla ILIKE $3)`;
        const args = [
            patron(c.buscar),
            c.idEspecialidad ?? null,
            c.especialidad ? patron(c.especialidad) : null,
        ];
        const [datos, conteo] = await Promise.all([
            this.dataSource.query<Especialista[]>(
                `SELECT ${listado},${datosModal} ${from}
                ORDER BY p.p_apellido NULLS LAST,p.s_apellido NULLS LAST,p.nombres,e.id LIMIT $4 OFFSET $5`,
                [...args, c.limite, (c.pagina - 1) * c.limite],
            ),
            this.dataSource.query<{ total: string }[]>(
                `SELECT COUNT(*)::text AS total ${from}`,
                args,
            ),
        ]);
        return { datos, total: Number(conteo[0].total) };
    }

    async buscarPorId(id: number): Promise<Especialista | null> {
        const rows = await this.dataSource.query<Especialista[]>(
            `SELECT ${listado},${datosModal} ${base} WHERE e.id=$1`,
            [id],
        );
        return rows[0] ?? null;
    }
}
