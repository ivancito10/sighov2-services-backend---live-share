import { DataSource, EntityManager } from 'typeorm';
import { PostgresFisioterapeutasRepository } from './postgres-fisioterapeutas.repository';
import type { RegistroFisioterapeuta } from '../../domain/models/fisioterapeuta.model';
const datos: RegistroFisioterapeuta = {
    ci: '123',
    complemento: null,
    nombres: 'Ana',
    primerApellido: 'Perez',
    segundoApellido: null,
    sexo: 'F',
    esExtranjero: false,
    fechaNacimiento: '2001-12-01',
    idEstadoCivil: 1,
    idDeptExp: 2,
    idNacimientoMunicipio: 69,
    matricula: '016201PEA',
    claveUnica: '123',
    permanente: true,
    fechaContratoInicio: null,
    fechaContratoFin: null,
    gradoAcademico: 'LICENCIADO',
    nombreUsuario: 'Ana Perez',
    email: 'aperezp@ssulapaz.org',
    passwordHash: 'hash-secreto',
    idUsuarioCreador: 17,
};
describe('Adaptador PostgreSQL fisioterapeutas', () => {
    let query: jest.Mock;
    let transaction: jest.Mock;
    let repo: PostgresFisioterapeutasRepository;
    let failAt: string | undefined;
    let duplicate: boolean;
    let emailTaken: boolean;
    beforeEach(() => {
        failAt = undefined;
        duplicate = false;
        emailTaken = false;
        query = jest.fn(async (sql: string) => {
            if (failAt && sql.includes(failAt))
                throw { code: 'XX000', detail: 'hash-secreto' };
            if (sql.startsWith('SELECT id FROM administracion.persona'))
                return duplicate ? [{ id: 99 }] : [];
            if (sql.startsWith('SELECT id FROM administracion.users')) {
                if (emailTaken) {
                    emailTaken = false;
                    return [{ id: 9 }];
                }
                return [];
            }
            if (sql.includes('AS civil'))
                return [
                    {
                        civil: true,
                        expedido: true,
                        municipio: true,
                        asegurado: true,
                        especialidad: true,
                        creador: true,
                    },
                ];
            if (sql.includes('INSERT INTO administracion.persona'))
                return [{ id: 10 }];
            if (sql.includes('INSERT INTO plataforma.especialista'))
                return [{ id: 20 }];
            if (sql.includes('INSERT INTO administracion.users'))
                return [{ id: '9007199254740993' }];
            return [];
        });
        transaction = jest.fn(
            async (fn: (manager: EntityManager) => Promise<unknown>) =>
                fn({ query } as unknown as EntityManager),
        );
        repo = new PostgresFisioterapeutasRepository({
            transaction,
        } as unknown as DataSource);
    });
    it('usa el mismo manager transaccional para las tres tablas y conserva bigint', async () => {
        const result = await repo.crear(datos);
        expect(transaction).toHaveBeenCalledTimes(1);
        expect(
            query.mock.calls.some(
                ([sql]: [string]) =>
                    sql.includes('administracion.roles') ||
                    sql.includes('model_has_roles'),
            ),
        ).toBe(false);
        expect(result).toEqual({
            idPersona: 10,
            esExtranjero: false,
            idEspecialista: 20,
            idUsuario: '9007199254740993',
            nombreCompleto: 'Ana Perez',
            email: datos.email,
            matricula: datos.matricula,
            foto: '20.jpg',
            imagen: '9007199254740993-U.png',
        });
        const inserts = query.mock.calls.filter(([sql]: [string]) =>
            sql.includes('INSERT INTO'),
        );
        expect(inserts).toHaveLength(3);
        expect(inserts[0][0]).toContain('administracion.persona');
        expect(inserts[1][0]).toContain('plataforma.especialista');
        expect(inserts[2][0]).toContain('administracion.users');
        expect(inserts[2][1]).toEqual([
            'Ana Perez',
            datos.email,
            'hash-secreto',
            10,
            17,
        ]);
        expect(inserts[1][0]).toContain('true,true,true,false,false');
        expect(result).not.toHaveProperty('passwordHash');
    });
    it.each([false, true])(
        'almacena es_extranjero=%s en persona',
        async (esExtranjero) => {
            const result = await repo.crear({ ...datos, esExtranjero });
            const insert = query.mock.calls.find(([sql]: [string]) =>
                sql.includes('INSERT INTO administracion.persona'),
            );
            expect(insert?.[0]).toContain('es_extranjero');
            expect(insert?.[1][13]).toBe(esExtranjero);
            expect(result.esExtranjero).toBe(esExtranjero);
        },
    );
    it('asigna sufijo cuando el correo ya existe', async () => {
        emailTaken = true;
        expect((await repo.crear(datos)).email).toBe('aperezp1@ssulapaz.org');
    });
    it('rechaza persona duplicada antes de escribir', async () => {
        duplicate = true;
        await expect(repo.crear(datos)).rejects.toMatchObject({
            tipo: 'conflicto',
        });
        expect(
            query.mock.calls.some(([sql]: [string]) => sql.includes('INSERT')),
        ).toBe(false);
    });
    it.each([
        'INSERT INTO administracion.persona',
        'INSERT INTO plataforma.especialista',
        'UPDATE plataforma.especialista',
        'INSERT INTO administracion.users',
        'UPDATE administracion.users',
    ])(
        'propaga fallo al callback transaccional sin filtrar parámetros: %s',
        async (stage) => {
            failAt = stage;
            await expect(repo.crear(datos)).rejects.toThrow(
                'la transacción fue revertida',
            );
            await expect(
                transaction.mock.results[0].value,
            ).rejects.toMatchObject({
                code: 'XX000',
            });
            const sqls = query.mock.calls.map(([sql]: [string]) => sql);
            expect(sqls[sqls.length - 1]).toContain(stage);
        },
    );
    it('traduce violaciones de unicidad sin exponer detalles SQL', async () => {
        query.mockRejectedValueOnce({
            driverError: { code: '23505' },
            query: 'SQL confidencial',
        });
        await expect(repo.crear(datos)).rejects.toMatchObject({
            tipo: 'conflicto',
        });
    });
});
