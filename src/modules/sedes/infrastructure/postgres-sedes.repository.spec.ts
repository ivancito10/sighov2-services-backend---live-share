import { DataSource } from 'typeorm';
import { PostgresSedesRepository } from './postgres-sedes.repository';
import { ConsultarSedesUseCase } from '../application/consultar-sedes.use-case';
describe('Sedes y residencia en etapa 1', () => {
    const query = jest.fn();
    const repo = new PostgresSedesRepository({
        query,
    } as unknown as DataSource);
    const service = new ConsultarSedesUseCase(repo);
    beforeEach(() => jest.resetAllMocks());
    it('devuelve sedes con y sin residencia y aplica paginación', async () => {
        const datos = [
            {
                id: 1,
                piso: '2',
                ubicacion: 'Central',
                id_residencia: 7,
                residencia: 'Av. 6 de Agosto',
            },
            {
                id: 2,
                piso: null,
                ubicacion: null,
                id_residencia: null,
                residencia: null,
            },
        ];
        query.mockImplementation(async (sql: string) =>
            sql.includes('COUNT(*)') ? [{ total: '2' }] : datos,
        );
        const r = await service.listar({
            pagina: '2',
            limite: '10',
            buscar: 'Agosto',
        });
        expect(r.datos).toEqual(datos);
        expect(r.total).toBe(2);
        expect(query.mock.calls[0][0]).toContain(
            'LEFT JOIN administracion.residencia',
        );
        expect(query.mock.calls[0][1]).toEqual(['%Agosto%', 10, 10]);
    });
    it('retorna 404 por sede ausente y 400 por ID fuera de rango', async () => {
        query.mockResolvedValue([]);
        await expect(service.obtener('9')).rejects.toMatchObject({
            status: 404,
            message: 'Sede no encontrada',
        });
        query.mockClear();
        await expect(service.obtener('2147483648')).rejects.toMatchObject({
            status: 400,
        });
        expect(query).not.toHaveBeenCalled();
    });
    it('rechaza filtros incorrectos', async () => {
        await expect(service.listar({ limite: '101' })).rejects.toMatchObject({
            status: 400,
        });
        await expect(
            service.listar({ buscar: ['a', 'b'] }),
        ).rejects.toMatchObject({ status: 400 });
    });
});
