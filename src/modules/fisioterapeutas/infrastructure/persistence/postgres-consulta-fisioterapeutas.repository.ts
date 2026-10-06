import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
    DataSource,
    In,
    IsNull,
    LessThanOrEqual,
    MoreThanOrEqual,
    Or,
} from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { ConsultaFisioterapeutasPort } from '../../domain/ports/consulta-fisioterapeutas.port';
import type { ConsultaFisioterapeutas } from '../../domain/models/consulta-fisioterapeuta.model';
import {
    HorarioOrm,
    SedeOrm,
} from '../../../../common/persistence/orm/entities';
import {
    especialistasQuery,
    buscarPersona,
    mapEspecialista,
} from '../../../../common/persistence/orm/lecturas';
const mapFisio = (e: Parameters<typeof mapEspecialista>[0]) => ({
    ...mapEspecialista(e),
    especialidad: { id: 89, nombre: 'FISIOTERAPIA' },
});
@Injectable()
export class PostgresConsultaFisioterapeutasRepository implements ConsultaFisioterapeutasPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly sighov: DataSource,
        @InjectDataSource(DB_CONNECTIONS.ETAPA2)
        private readonly etapa2: DataSource,
    ) {}
    async listar(c: ConsultaFisioterapeutas) {
        const [rows, total] = await buscarPersona(
            especialistasQuery(this.sighov).where({ idEspecialidad: 89 }),
            c.buscar,
            true,
        )
            .orderBy('p.primerApellido', 'ASC', 'NULLS LAST')
            .addOrderBy('p.segundoApellido', 'ASC', 'NULLS LAST')
            .addOrderBy('p.nombres', 'ASC')
            .addOrderBy('e.id', 'ASC')
            .skip((c.pagina - 1) * c.limite)
            .take(c.limite)
            .getManyAndCount();
        return { datos: rows.map(mapFisio), total };
    }
    async buscar(id: string) {
        const row = await especialistasQuery(this.sighov)
            .where({ id: Number(id), idEspecialidad: 89 })
            .getOne();
        return row ? mapFisio(row) : null;
    }
    async horarios(id: string) {
        const hoy = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/La_Paz',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());
        const vigente = {
            estado: true,
            vigenteDesde: Or(IsNull(), LessThanOrEqual(hoy)),
            vigenteHasta: Or(IsNull(), MoreThanOrEqual(hoy)),
        };
        const rows = await this.etapa2.getRepository(HorarioOrm).find({
            where: {
                ...vigente,
                asignacion: { ...vigente, idEspecialista: Number(id) },
                politica: vigente,
            },
            relations: { asignacion: true, politica: true },
            order: {
                horaInicio: 'ASC',
                asignacion: { idSede: 'ASC' },
                id: 'ASC',
            },
        });
        return rows.map((h) => ({
            idHorario: h.id,
            idEspecialista: h.asignacion.idEspecialista,
            idAsignacionSede: h.asignacion.id,
            idSede: h.asignacion.idSede,
            idPoliticaAgenda: h.politica.id,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin,
            intervalo: h.intervalo,
            vigenteDesde: h.vigenteDesde,
            vigenteHasta: h.vigenteHasta,
            cuposNormales: h.politica.cuposNormales,
            cuposEspeciales: h.politica.cuposEspeciales,
        }));
    }
    sedes(ids: number[]) {
        return ids.length
            ? this.sighov.getRepository(SedeOrm).find({
                  where: { id: In(ids) },
                  select: { id: true, piso: true, ubicacion: true },
              })
            : Promise.resolve([]);
    }
}