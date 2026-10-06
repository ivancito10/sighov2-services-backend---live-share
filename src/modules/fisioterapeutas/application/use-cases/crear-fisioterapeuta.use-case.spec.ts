import { CrearFisioterapeutaUseCase } from './crear-fisioterapeuta.use-case';
import type { CrearFisioterapeuta } from '../../domain/models/fisioterapeuta.model';
import {
    generarMatricula,
    generarEmail,
} from '../../domain/services/datos-fisioterapeuta';
import { BcryptPasswordHasher } from '../../infrastructure/security/bcrypt-password-hasher';
import * as bcrypt from 'bcrypt';
const input: CrearFisioterapeuta = {
    ci: '123456',
    nombres: 'María',
    primerApellido: 'Pérez',
    segundoApellido: 'López',
    sexo: 'F',
    esExtranjero: false,
    fechaNacimiento: '2001-12-01',
    idEstadoCivil: 1,
    idDeptExp: 2,
    tipoContrato: 'EVENTUAL',
    fechaContratoInicio: '2026-01-01',
    fechaContratoFin: '2026-12-31',
    gradoAcademico: 'LICENCIADO',
};
describe('Registro fisioterapeuta: reglas', () => {
    const repo = {
        crear: jest.fn().mockResolvedValue({ idPersona: 1 }),
        catalogos: jest.fn(),
    };
    const hasher = {
        generarTemporal: jest.fn().mockResolvedValue({
            passwordTemporal: 'solo-prueba',
            passwordHash: 'hash-prueba',
        }),
    };
    const useCase = new CrearFisioterapeutaUseCase(repo, hasher, {
        emailDomain: 'ssulapaz.org',
        idNacimientoMunicipio: 69,
    });
    beforeEach(() => jest.clearAllMocks());
    it.each([
        ['F', 'Pérez', 'López', '016201PLM'],
        ['M', 'Pérez', 'López', '011201PLM'],
        ['F', 'Pérez', null, '016201PÉM'],
        ['F', null, 'López', '016201LÓM'],
    ] as const)('matrícula %s %s %s', (sexo, p, s, expected) => {
        expect(generarMatricula('2001-12-01', sexo, 'María', p, s)).toBe(
            expected,
        );
    });
    it.each([
        ['Pérez', 'López', 'mperezl@ssulapaz.org'],
        ['Pérez', null, 'mperezp@ssulapaz.org'],
        [null, 'López', 'mlopezl@ssulapaz.org'],
    ])('correo %s %s', (p, s, email) =>
        expect(generarEmail('María', p, s, 'ssulapaz.org')).toBe(email),
    );
    it('genera datos derivados y solo pasa el hash a persistencia', async () => {
        const result = await useCase.ejecutar(
            { ...input, complemento: 'a' },
            17,
        );
        expect(repo.crear).toHaveBeenCalledWith(
            expect.objectContaining({
                idUsuarioCreador: 17,
                claveUnica: '123456A',
                matricula: '016201PLM',
                idNacimientoMunicipio: 69,
                email: 'mperezl@ssulapaz.org',
                passwordHash: 'hash-prueba',
                permanente: false,
            }),
        );
        expect(repo.crear.mock.calls[0][0]).not.toHaveProperty(
            'passwordTemporal',
        );
        expect(result.passwordTemporal).toBe('solo-prueba');
    });
    it('contrato permanente elimina fechas recibidas', async () => {
        await useCase.ejecutar({ ...input, tipoContrato: 'PERMANENTE' }, 17);
        expect(repo.crear).toHaveBeenCalledWith(
            expect.objectContaining({
                permanente: true,
                fechaContratoInicio: null,
                fechaContratoFin: null,
            }),
        );
    });
    it.each([
        { fechaNacimiento: '2001-02-29' },
        { fechaNacimiento: '2999-01-01' },
        { fechaContratoFin: null },
        { fechaContratoInicio: '2027-01-01' },
        { fechaContratoFin: '2026-02-30' },
        { primerApellido: null, segundoApellido: null },
        { nombres: '   ' },
        { idDeptExp: 0 },
    ])('rechaza entrada inválida %j', async (change) => {
        await expect(
            useCase.ejecutar({ ...input, ...change }, 17),
        ).rejects.toThrow();
        expect(repo.crear).not.toHaveBeenCalled();
    });
    it('no inventa creador', async () => {
        await expect(useCase.ejecutar(input, 0)).rejects.toThrow(
            'Usuario creador inválido',
        );
    });
    it('bcrypt genera contraseñas distintas que se pueden verificar', async () => {
        const service = new BcryptPasswordHasher();
        const a = await service.generarTemporal();
        const b = await service.generarTemporal();
        expect(a.passwordTemporal).not.toBe(b.passwordTemporal);
        expect(a.passwordTemporal).toHaveLength(24);
        expect(await bcrypt.compare(a.passwordTemporal, a.passwordHash)).toBe(
            true,
        );
        expect(await bcrypt.compare('incorrecta', a.passwordHash)).toBe(false);
    });
});
