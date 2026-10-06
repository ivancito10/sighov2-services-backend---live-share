import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Equal, IsNull, Or } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import {
    PersonaOrm,
    EspecialistaOrm,
    UsuarioOrm,
} from '../../../../common/persistence/orm/entities';
import { IncorporarFisioterapeutaPort } from '../../domain/ports/incorporar-fisioterapeuta.port';
import type { SeleccionIncorporacion } from '../../domain/ports/incorporar-fisioterapeuta.port';
import type { RegistroFisioterapeuta } from '../../domain/models/fisioterapeuta.model';
import { RegistroFisioterapeutaError as ErrorRegistro } from '../../domain/errors/registro-fisioterapeuta.error';
import {
    transaccionFisio,
    referencias,
    documentoLibre,
    personaDatos,
    especialistaDatos,
    crearEspecialista,
    crearUsuario,
    crearPersona,
} from './orm-escritura';
function seleccionar<T extends { id: string | number }>(
    rows: T[],
    id: string | number | undefined,
    recurso: string,
): T | undefined {
    if (id !== undefined) {
        const row = rows.find((r) => String(r.id) === String(id));
        if (!row)
            throw new ErrorRegistro(
                'validacion',
                `${recurso} no pertenece a la persona seleccionada`,
            );
        return row;
    }
    if (rows.length > 1)
        throw new ErrorRegistro(
            'conflicto',
            `Existen varios registros de ${recurso}; envíe su ID explícitamente`,
        );
    return rows[0];
}
@Injectable()
export class PostgresIncorporarFisioterapeutaRepository implements IncorporarFisioterapeutaPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly db: DataSource,
    ) {}
    incorporar(s: SeleccionIncorporacion, d: RegistroFisioterapeuta) {
        return transaccionFisio(this.db, async (m) => {
            const personas = m.getRepository(PersonaOrm);
            let p;
            if (s.idPersona !== undefined) {
                p = await personas.findOne({
                    where: { id: s.idPersona },
                    lock: { mode: 'pessimistic_write' },
                });
            } else {
                const coincidencias = await personas.find({
                    where: {
                        ci: d.ci,
                        complemento: d.complemento ?? Or(IsNull(), Equal('')),
                    },
                    take: 2,
                    lock: { mode: 'pessimistic_write' },
                });
                if (coincidencias.length > 1)
                    throw new ErrorRegistro(
                        'conflicto',
                        'Varias personas tienen el documento; seleccione idPersona',
                    );
                p = coincidencias[0];
            }
            if (!p && s.idPersona !== undefined)
                throw new ErrorRegistro(
                    'no_encontrado',
                    'La persona seleccionada no existe',
                );
            const personaCreada = !p;
            if (!p) {
                if (s.idEspecialista !== undefined || s.idUsuario !== undefined)
                    throw new ErrorRegistro(
                        'validacion',
                        'No se pueden seleccionar especialista o usuario para una persona nueva',
                    );
                await documentoLibre(m, d);
                await referencias(m, d, d.idUsuarioCreador);
                p = await crearPersona(m, d);
            }
            const especialistas = await m.getRepository(EspecialistaOrm).find({
                where: { idPersona: p.id },
                order: { id: 'ASC' },
            });
            const usuarios = await m.getRepository(UsuarioOrm).find({
                where: { idPersona: p.id },
                order: { id: 'ASC' },
            });
            const e = seleccionar(
                    especialistas,
                    s.idEspecialista,
                    'especialista',
                ),
                u = seleccionar(usuarios, s.idUsuario, 'usuario');
            if (!personaCreada) {
                await documentoLibre(m, d, p.id);
                await referencias(m, d, d.idUsuarioCreador);
                await personas.update(
                    { id: p.id },
                    {
                        ...personaDatos(d),
                        idUsuarioActualizador: d.idUsuarioCreador,
                    },
                );
            }
            let idEspecialista: number;
            if (e) {
                await m.getRepository(EspecialistaOrm).update(
                    { id: e.id },
                    {
                        ...especialistaDatos(d),
                        idUsuarioActualizador: d.idUsuarioCreador,
                    },
                );
                idEspecialista = e.id;
            } else idEspecialista = (await crearEspecialista(m, p.id, d)).id;
            let idUsuario: string, email: string | null;
            if (u) {
                await m.getRepository(UsuarioOrm).update(
                    { id: u.id },
                    {
                        name: d.nombreUsuario,
                        idUsuarioActualizador: String(d.idUsuarioCreador),
                    },
                );
                idUsuario = u.id;
                email = u.email;
            } else {
                const nuevo = await crearUsuario(m, p.id, d);
                idUsuario = nuevo.id;
                email = nuevo.email;
            }
            return {
                personaCreada,
                idPersona: p.id,
                idEspecialista,
                idUsuario,
                especialistaCreado: !e,
                usuarioCreado: !u,
                email,
                matricula: d.matricula,
            };
        });
    }
}