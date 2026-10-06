import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import {
    PersonaOrm,
    EspecialistaOrm,
    UsuarioOrm,
} from '../../../../common/persistence/orm/entities';
import { EditarFisioterapeutaPort } from '../../domain/ports/editar-fisioterapeuta.port';
import type { CambiosFisioterapeuta } from '../../domain/ports/editar-fisioterapeuta.port';
import type { CrearFisioterapeuta } from '../../domain/models/fisioterapeuta.model';
import { RegistroFisioterapeutaError } from '../../domain/errors/registro-fisioterapeuta.error';
import {
    transaccionFisio,
    referencias,
    documentoLibre,
    personaDatos,
} from './orm-escritura';
@Injectable()
export class PostgresEditarFisioterapeutaRepository implements EditarFisioterapeutaPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly db: DataSource,
    ) {}
    editar(
        id: number,
        actor: number,
        preparar: (actual: CrearFisioterapeuta) => CambiosFisioterapeuta,
    ) {
        return transaccionFisio(this.db, async (m) => {
            const e = await m.getRepository(EspecialistaOrm).findOne({
                where: { id, idEspecialidad: 89 },
                lock: { mode: 'pessimistic_write' },
            });
            if (!e)
                throw new RegistroFisioterapeutaError(
                    'no_encontrado',
                    'Fisioterapeuta no encontrado',
                );
            const p = await m.getRepository(PersonaOrm).findOne({
                where: { id: e.idPersona },
                lock: { mode: 'pessimistic_write' },
            });
            if (!p)
                throw new RegistroFisioterapeutaError(
                    'no_encontrado',
                    'Persona no encontrada',
                );
            const d = preparar({
                ci: p.ci,
                complemento: p.complemento,
                nombres: p.nombres,
                primerApellido: p.primerApellido,
                segundoApellido: p.segundoApellido,
                sexo: p.sexo as CrearFisioterapeuta['sexo'],
                esExtranjero: p.esExtranjero as boolean,
                fechaNacimiento: p.fechaNacimiento!,
                idEstadoCivil: p.idEstadoCivil!,
                idDeptExp: p.idDeptExp!,
                tipoContrato: e.permanente ? 'PERMANENTE' : 'EVENTUAL',
                fechaContratoInicio: e.fechaContratoInicio,
                fechaContratoFin: e.fechaContratoFin,
                gradoAcademico:
                    e.gradoAcademico as CrearFisioterapeuta['gradoAcademico'],
            });
            await documentoLibre(
                m,
                { ...d, complemento: d.complemento ?? null },
                p.id,
            );
            await referencias(m, d);
            await m.getRepository(PersonaOrm).update(
                { id: p.id },
                {
                    ...personaDatos({
                        ...d,
                        primerApellido: d.primerApellido ?? null,
                        segundoApellido: d.segundoApellido ?? null,
                        complemento: d.complemento ?? null,
                    }),
                    idUsuarioActualizador: actor,
                },
            );
            await m.getRepository(EspecialistaOrm).update(
                { id },
                {
                    permanente: d.tipoContrato === 'PERMANENTE',
                    fechaContratoInicio: d.fechaContratoInicio ?? null,
                    fechaContratoFin: d.fechaContratoFin ?? null,
                    gradoAcademico: d.gradoAcademico,
                    idUsuarioActualizador: actor,
                },
            );
            await m.getRepository(UsuarioOrm).update(
                { idPersona: p.id },
                {
                    name: d.nombreUsuario,
                    idUsuarioActualizador: String(actor),
                },
            );
            return {
                idEspecialista: id,
                idPersona: p.id,
                matricula: d.matricula,
            };
        });
    }
    async estado(id: number, actor: number, estado: boolean) {
        const result = await this.db
            .getRepository(EspecialistaOrm)
            .update(
                { id, idEspecialidad: 89 },
                { estado, idUsuarioActualizador: actor },
            );
        if (!result.affected)
            throw new RegistroFisioterapeutaError(
                'no_encontrado',
                'Fisioterapeuta no encontrado: el ID no existe o no pertenece a la especialidad de fisioterapia',
            );
        return { idEspecialista: id, estado };
    }
}