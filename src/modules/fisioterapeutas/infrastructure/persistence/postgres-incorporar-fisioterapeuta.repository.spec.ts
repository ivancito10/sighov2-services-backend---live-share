import { DataSource } from 'typeorm';
import { PostgresIncorporarFisioterapeutaRepository } from './postgres-incorporar-fisioterapeuta.repository';
import type { RegistroFisioterapeuta } from '../../domain/models/fisioterapeuta.model';
describe('Incorporación transaccional', () => {
    const query = jest.fn();
    const transaction = jest.fn(async (fn) => fn({ query }));
    const repo = new PostgresIncorporarFisioterapeutaRepository({
        transaction,
    } as unknown as DataSource);
    const datos = {
        ci: '123',
        claveUnica: '123',
        email: 'aperez@ssulapaz.org',
        nombreUsuario: 'ANA PEREZ',
        passwordHash: 'hash',
        matricula: '010101PEA',
        idUsuarioCreador: 17,
    } as RegistroFisioterapeuta;
    let especialistas: { id: number }[];
    let usuarios: { id: string; email: string }[];
    beforeEach(() => {
        jest.clearAllMocks();
        especialistas = [{ id: 8 }];
        usuarios = [{ id: '9', email: 'original@ssulapaz.org' }];
        query.mockImplementation(async (sql: string) => {
            if (
                sql.startsWith(
                    'SELECT id FROM administracion.persona WHERE id=$1',
                )
            )
                return [{ id: 3 }];
            if (sql.startsWith('SELECT id FROM plataforma.especialista'))
                return especialistas;
            if (sql.startsWith('SELECT id::text AS id,email')) return usuarios;
            if (sql.includes('AS civil'))
                return [
                    {
                        civil: true,
                        expedido: true,
                        especialidad: true,
                        actor: true,
                    },
                ];
            if (sql.startsWith('INSERT INTO plataforma.especialista'))
                return [{ id: 18 }];
            if (sql.startsWith('INSERT INTO administracion.users'))
                return [{ id: '19' }];
            return [];
        });
    });
    it.each([true, false])(
        'reutiliza persona y usuario; especialista existente=%s',
        async (existe) => {
            if (!existe) especialistas = [];
            const r = await repo.incorporar({ idPersona: 3 }, datos);
            expect(r).toMatchObject({
                idPersona: 3,
                idUsuario: '9',
                usuarioCreado: false,
                especialistaCreado: !existe,
                email: 'original@ssulapaz.org',
            });
            const sqls = query.mock.calls.map(([sql]) => sql as string);
            expect(
                sqls.some((sql) =>
                    sql.startsWith('INSERT INTO administracion.persona'),
                ),
            ).toBe(false);
            const update = sqls.find((sql) =>
                sql.startsWith('UPDATE administracion.users'),
            )!;
            expect(update).not.toMatch(/password|email|estado=|imagen/);
            expect(
                sqls.find((sql) =>
                    sql.startsWith('UPDATE administracion.persona'),
                ),
            ).not.toMatch(/id_tipo_asegurado|afiliado|id_nacimiento_municipio/);
            expect(transaction).toHaveBeenCalledTimes(1);
        },
    );
    it('crea solamente relaciones faltantes', async () => {
        especialistas = [];
        usuarios = [];
        expect(await repo.incorporar({ idPersona: 3 }, datos)).toMatchObject({
            idEspecialista: 18,
            idUsuario: '19',
            especialistaCreado: true,
            usuarioCreado: true,
        });
        expect(
            query.mock.calls.find(([sql]) =>
                sql.startsWith('INSERT INTO administracion.users'),
            )![1],
        ).toContain('hash');
    });
    it('no selecciona arbitrariamente entre varios especialistas', async () => {
        especialistas = [{ id: 8 }, { id: 10 }];
        await expect(
            repo.incorporar({ idPersona: 3 }, datos),
        ).rejects.toMatchObject({ tipo: 'conflicto' });
        expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(
            false,
        );
        expect(
            await repo.incorporar({ idPersona: 3, idEspecialista: 10 }, datos),
        ).toMatchObject({ idEspecialista: 10 });
    });
    it('rechaza IDs ajenos a la persona', async () => {
        await expect(
            repo.incorporar({ idPersona: 3, idUsuario: '100' }, datos),
        ).rejects.toThrow('no pertenece');
        expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(
            false,
        );
    });
    it('no expone parámetros del error de PostgreSQL', async () => {
        const original = query.getMockImplementation()!;
        query.mockImplementation(async (sql, ...args) => {
            if (sql.startsWith('UPDATE administracion.users'))
                throw new Error('password secreto');
            return original(sql, ...args);
        });
        await expect(repo.incorporar({ idPersona: 3 }, datos)).rejects.toThrow(
            'transacción fue revertida',
        );
    });
});