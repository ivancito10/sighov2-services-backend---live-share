import { DataSource } from 'typeorm';
import { PostgresEditarFisioterapeutaRepository } from './postgres-editar-fisioterapeuta.repository';
import { EditarFisioterapeutaUseCase } from '../../application/use-cases/editar-fisioterapeuta.use-case';
const actual = {
    idPersona: 91,
    ci: '123',
    nombres: 'Ana',
    primerApellido: 'Perez',
    segundoApellido: null,
    complemento: null,
    sexo: 'F',
    esExtranjero: false,
    fechaNacimiento: '2001-12-01',
    idEstadoCivil: 1,
    idDeptExp: 2,
    tipoContrato: 'PERMANENTE',
    gradoAcademico: 'LICENCIADO',
};
describe('Edici�n transaccional de fisioterapeutas', () => {
    const query = jest.fn();
    const transaction = jest.fn(async (fn) => fn({ query }));
    const repo = new PostgresEditarFisioterapeutaRepository({
        query,
        transaction,
    } as unknown as DataSource);
    const service = new EditarFisioterapeutaUseCase(repo);
    beforeEach(() => {
        jest.clearAllMocks();
        query.mockImplementation(async (sql: string) =>
            sql.includes('FOR UPDATE')
                ? [actual]
                : sql.startsWith('SELECT EXISTS')
                  ? [{ civil: true, expedido: true }]
                  : [],
        );
    });
    it('edita persona/especialista/nombre de usuario sin modificar credenciales', async () => {
        expect(await service.editar('20', { sexo: 'M' }, 17)).toEqual({
            idEspecialista: 20,
            idPersona: 91,
            matricula: '011201PEA',
        });
        const updates = query.mock.calls.filter(([sql]) =>
            sql.startsWith('UPDATE'),
        );
        expect(updates).toHaveLength(3);
        expect(updates.every(([sql]) => sql.includes('id_user_updated'))).toBe(
            true,
        );
        expect(updates.map(([sql]) => sql).join(' ')).not.toMatch(
            /password|email/,
        );
        expect(transaction).toHaveBeenCalledTimes(1);
    });
    it('rechaza duplicados sin escribir datos', async () => {
        query.mockImplementation(async (sql: string) =>
            sql.includes('FOR UPDATE')
                ? [actual]
                : sql.includes('WHERE id<>')
                  ? [{ id: 99 }]
                  : [],
        );
        await expect(service.editar('20', { ci: '456' }, 17)).rejects.toThrow(
            'mismo documento',
        );
        expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(
            false,
        );
    });
    it('propaga fallo dentro de la transacci�n para revertir todas las escrituras', async () => {
        query.mockImplementation(async (sql: string) => {
            if (sql.includes('FOR UPDATE')) return [actual];
            if (sql.startsWith('SELECT EXISTS'))
                return [{ civil: true, expedido: true }];
            if (sql.startsWith('UPDATE plataforma'))
                throw new Error('DB error');
            return [];
        });
        await expect(service.editar('20', { sexo: 'M' }, 17)).rejects.toThrow(
            'transacci�n revertida',
        );
        expect(
            query.mock.calls.some(([sql]) =>
                sql.startsWith('UPDATE administracion.users'),
            ),
        ).toBe(false);
    });
    it.each([false, true])(
        'actualiza solo fisioterapia y devuelve un objeto: %s',
        async (estado) => {
            query.mockResolvedValue([[{ idEspecialista: 20, estado }], 1]);
            expect(await service.estado('20', estado, 17)).toEqual({
                idEspecialista: 20,
                estado,
            });
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE id=$3 AND id_especialidad=89'),
                [estado, 17, 20],
            );
            expect(query).toHaveBeenCalledTimes(1);
        },
    );
    it('no encontrado devuelve error de dominio', async () => {
        query.mockResolvedValue([[], 0]);
        await expect(service.estado('20', false, 17)).rejects.toThrow(
            'no encontrado',
        );
        query.mockResolvedValue([]);
        await expect(service.editar('20', { sexo: 'M' }, 17)).rejects.toThrow(
            'no encontrado',
        );
    });
});
