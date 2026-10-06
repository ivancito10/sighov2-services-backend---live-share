import { DataSource } from 'typeorm';
import { PersonaOrm, EspecialistaOrm, UsuarioOrm } from './entities';
import { PostgresFisioterapeutasRepository } from '../../../modules/fisioterapeutas/infrastructure/persistence/postgres-fisioterapeutas.repository';
import { PostgresEditarFisioterapeutaRepository } from '../../../modules/fisioterapeutas/infrastructure/persistence/postgres-editar-fisioterapeuta.repository';
import { PostgresIncorporarFisioterapeutaRepository } from '../../../modules/fisioterapeutas/infrastructure/persistence/postgres-incorporar-fisioterapeuta.repository';
import { EditarFisioterapeutaUseCase } from '../../../modules/fisioterapeutas/application/use-cases/editar-fisioterapeuta.use-case';
import type { RegistroFisioterapeuta } from '../../../modules/fisioterapeutas/domain/models/fisioterapeuta.model';
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
describe('Escrituras TypeORM de fisioterapia', () => {
    const repos = new Map();
    const getRepository = jest.fn((schema) => {
        if (!repos.has(schema))
            repos.set(schema, {
                exists: jest.fn().mockResolvedValue(false),
                existsBy: jest.fn().mockResolvedValue(true),
                find: jest.fn().mockResolvedValue([]),
                findOne: jest.fn().mockResolvedValue(null),
                create: jest.fn((x) => x),
                save: jest.fn(async (x: { email?: unknown }) => ({
                    ...x,
                    id:
                        schema === UsuarioOrm
                            ? '9007199254740993'
                            : schema === PersonaOrm
                              ? 10
                              : 20,
                })),
                update: jest.fn().mockResolvedValue({ affected: 1 }),
            });
        return repos.get(schema);
    });
    const transaction = jest.fn(async (_nivel, fn) => fn({ getRepository }));
    const db = { getRepository, transaction } as unknown as DataSource;
    const crear = new PostgresFisioterapeutasRepository(db);
    const editar = new PostgresEditarFisioterapeutaRepository(db);
    const incorporar = new PostgresIncorporarFisioterapeutaRepository(db);
    beforeEach(() => {
        repos.clear();
        jest.clearAllMocks();
        transaction.mockImplementation(async (_nivel, fn) =>
            fn({ getRepository }),
        );
        getRepository(UsuarioOrm).existsBy.mockImplementation(
            async (x: { email?: unknown }) => !x.email,
        );
    });
    it('guarda las tres tablas dentro del mismo manager y conserva bigint', async () => {
        const r = await crear.crear(datos);
        expect(transaction).toHaveBeenCalledWith(
            'SERIALIZABLE',
            expect.any(Function),
        );
        expect(r).toMatchObject({
            idPersona: 10,
            idEspecialista: 20,
            idUsuario: '9007199254740993',
            foto: '20.jpg',
            imagen: '9007199254740993-U.png',
        });
        expect(getRepository(UsuarioOrm).save).toHaveBeenCalledWith(
            expect.objectContaining({ password: 'hash-secreto' }),
        );
        expect(r).not.toHaveProperty('passwordHash');
    });
    it.each([true, false])('persiste esExtranjero=%s', async (esExtranjero) => {
        await crear.crear({ ...datos, esExtranjero });
        expect(getRepository(PersonaOrm).save).toHaveBeenCalledWith(
            expect.objectContaining({ esExtranjero }),
        );
    });
    it('rechaza documento duplicado sin guardar', async () => {
        getRepository(PersonaOrm).exists.mockResolvedValue(true);
        await expect(crear.crear(datos)).rejects.toMatchObject({
            tipo: 'conflicto',
        });
        expect(getRepository(PersonaOrm).save).not.toHaveBeenCalled();
    });
    it('elige sufijo de correo disponible', async () => {
        let veces = 0;
        getRepository(UsuarioOrm).existsBy.mockImplementation(
            async (x: { email?: unknown }) => (x.email ? veces++ === 0 : true),
        );
        expect((await crear.crear(datos)).email).toBe('aperezp1@ssulapaz.org');
    });
    it.each([PersonaOrm, EspecialistaOrm, UsuarioOrm])(
        'propaga fallos al callback transaccional y oculta parámetros (%s)',
        async (schema) => {
            getRepository(schema).save.mockRejectedValue({
                code: 'XX000',
                parameters: ['hash-secreto'],
            });
            await expect(crear.crear(datos)).rejects.toThrow(
                'la transacción fue revertida',
            );
            await expect(
                transaction.mock.results[0].value,
            ).rejects.toMatchObject({ code: 'XX000' });
        },
    );
    it('reintenta una transacción completa tras conflicto serializable', async () => {
        transaction.mockRejectedValueOnce({ code: '40001' });
        await crear.crear(datos);
        expect(transaction).toHaveBeenCalledTimes(2);
    });
    it('traduce unicidad y conflictos agotados a 409 de dominio', async () => {
        transaction.mockRejectedValueOnce({ code: '23505' });
        await expect(crear.crear(datos)).rejects.toMatchObject({
            tipo: 'conflicto',
        });
        transaction.mockRejectedValue({ code: '40001' });
        await expect(crear.crear(datos)).rejects.toMatchObject({
            tipo: 'conflicto',
        });
    });
    it.each([true, false])(
        'estado=%s solo afecta especialidad 89',
        async (estado) => {
            expect(await editar.estado(20, 17, estado)).toEqual({
                idEspecialista: 20,
                estado,
            });
            expect(getRepository(EspecialistaOrm).update).toHaveBeenCalledWith(
                { id: 20, idEspecialidad: 89 },
                { estado, idUsuarioActualizador: 17 },
            );
            getRepository(EspecialistaOrm).update.mockResolvedValue({
                affected: 0,
            });
            await expect(editar.estado(21, 17, estado)).rejects.toMatchObject({
                tipo: 'no_encontrado',
            });
        },
    );
    it('edita conservando credenciales y datos de aseguramiento', async () => {
        getRepository(EspecialistaOrm).findOne.mockResolvedValue({
            id: 20,
            idPersona: 10,
            ...datos,
        });
        getRepository(PersonaOrm).findOne.mockResolvedValue({
            id: 10,
            ...datos,
        });
        const service = new EditarFisioterapeutaUseCase(editar);
        await service.editar('20', { sexo: 'M' }, 17);
        expect(getRepository(UsuarioOrm).update).toHaveBeenCalledWith(
            { idPersona: 10 },
            { name: 'Ana Perez', idUsuarioActualizador: '17' },
        );
        expect(
            getRepository(PersonaOrm).update.mock.calls[0][1],
        ).not.toHaveProperty('idTipoAsegurado');
    });
    it('incorpora sin duplicar registros y no restablece credenciales', async () => {
        getRepository(PersonaOrm).findOne.mockResolvedValue({ id: 10 });
        getRepository(EspecialistaOrm).find.mockResolvedValue([{ id: 20 }]);
        getRepository(UsuarioOrm).find.mockResolvedValue([
            { id: '30', email: 'original@test.bo' },
        ]);
        expect(
            await incorporar.incorporar({ idPersona: 10 }, datos),
        ).toMatchObject({
            usuarioCreado: false,
            especialistaCreado: false,
            email: 'original@test.bo',
        });
        expect(getRepository(UsuarioOrm).update).toHaveBeenCalledWith(
            { id: '30' },
            { name: 'Ana Perez', idUsuarioActualizador: '17' },
        );
        expect(getRepository(PersonaOrm).save).not.toHaveBeenCalled();
    });
    it('crea persona, especialista y usuario al omitir idPersona y no encontrar documento', async () => {
        const r = await incorporar.incorporar({}, datos);
        expect(r).toMatchObject({
            personaCreada: true,
            especialistaCreado: true,
            usuarioCreado: true,
            idPersona: 10,
        });
        expect(getRepository(PersonaOrm).save).toHaveBeenCalledWith(
            expect.objectContaining({
                ci: '123',
                idTipoAsegurado: 1,
                idNacimientoMunicipio: 69,
            }),
        );
        expect(getRepository(PersonaOrm).update).not.toHaveBeenCalled();
        expect(getRepository(EspecialistaOrm).save).toHaveBeenCalledWith(
            expect.objectContaining({ idPersona: 10 }),
        );
    });
    it('reutiliza la persona encontrada por documento sin idPersona', async () => {
        getRepository(PersonaOrm).find.mockResolvedValue([{ id: 55 }]);
        const r = await incorporar.incorporar({}, datos);
        expect(r).toMatchObject({ personaCreada: false, idPersona: 55 });
        expect(getRepository(PersonaOrm).save).not.toHaveBeenCalled();
        expect(getRepository(UsuarioOrm).find).toHaveBeenCalledWith(
            expect.objectContaining({ where: { idPersona: 55 } }),
        );
    });
    it('rechaza documentos ambiguos antes de escribir', async () => {
        getRepository(PersonaOrm).find.mockResolvedValue([
            { id: 55 },
            { id: 56 },
        ]);
        await expect(incorporar.incorporar({}, datos)).rejects.toMatchObject({
            tipo: 'conflicto',
        });
        expect(getRepository(PersonaOrm).save).not.toHaveBeenCalled();
    });
    it('rechaza referencias a cuentas ajenas cuando la persona es nueva', async () => {
        await expect(
            incorporar.incorporar({ idUsuario: '99' }, datos),
        ).rejects.toMatchObject({ tipo: 'validacion' });
        expect(getRepository(PersonaOrm).save).not.toHaveBeenCalled();
    });
    it('busca CI y complemento juntos y propaga fallos para revertir la transacción', async () => {
        getRepository(UsuarioOrm).save.mockRejectedValue(new Error('fallo'));
        await expect(
            incorporar.incorporar({}, { ...datos, complemento: '1A' }),
        ).rejects.toThrow('transacción fue revertida');
        expect(getRepository(PersonaOrm).find).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { ci: '123', complemento: '1A' },
            }),
        );
    });
    it('incorpora creando únicamente las relaciones faltantes', async () => {
        getRepository(PersonaOrm).findOne.mockResolvedValue({ id: 10 });
        expect(
            await incorporar.incorporar({ idPersona: 10 }, datos),
        ).toMatchObject({ usuarioCreado: true, especialistaCreado: true });
        expect(getRepository(PersonaOrm).save).not.toHaveBeenCalled();
    });
    it('rechaza ambigüedades, IDs ajenos y persona ausente', async () => {
        await expect(
            incorporar.incorporar({ idPersona: 10 }, datos),
        ).rejects.toMatchObject({ tipo: 'no_encontrado' });
        getRepository(PersonaOrm).findOne.mockResolvedValue({ id: 10 });
        getRepository(EspecialistaOrm).find.mockResolvedValue([
            { id: 20 },
            { id: 21 },
        ]);
        await expect(
            incorporar.incorporar({ idPersona: 10 }, datos),
        ).rejects.toMatchObject({ tipo: 'conflicto' });
        await expect(
            incorporar.incorporar({ idPersona: 10, idEspecialista: 99 }, datos),
        ).rejects.toMatchObject({ tipo: 'validacion' });
        expect(getRepository(PersonaOrm).update).not.toHaveBeenCalled();
    });
});
