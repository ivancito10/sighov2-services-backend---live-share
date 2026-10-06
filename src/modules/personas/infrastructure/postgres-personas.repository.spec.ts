import { DataSource } from 'typeorm';
import { PostgresPersonasRepository } from './postgres-personas.repository';
import { ConsultarPersonasUseCase } from '../application/consultar-personas.use-case';
describe('Personas institucionales', () => {
    const query = jest.fn();
    const repo = new PostgresPersonasRepository({
        query,
    } as unknown as DataSource);
    const servicio = new ConsultarPersonasUseCase(repo);
    beforeEach(() => jest.resetAllMocks());
    it('consulta todas las personas sin depender de órdenes y conserva referencias opcionales', async () => {
        query.mockImplementation(async (sql: string) =>
            sql.includes('COUNT(*)')
                ? [{ total: '1' }]
                : [
                      {
                          id: 7,
                          expedido: { id: null, nombre: null, sigla: null },
                      },
                  ],
        );
        const r = await servicio.listar({
            buscar: '123%',
            pagina: '2',
            limite: '10',
        });
        expect(r.datos).toHaveLength(1);
        const [sql, args] = query.mock.calls[0];
        for (const tabla of [
            'departamento',
            'estado_civil',
            'municipio',
            'tipo_asegurado',
            'users',
        ])
            expect(sql).toContain('LEFT JOIN administracion.' + tabla);
        expect(sql).not.toMatch(/sol_fisioterapia|password|INNER JOIN/);
        expect(args).toEqual(['%123\\%%', 10, 10]);
    });
    it('valida identificadores y persona ausente', async () => {
        await expect(servicio.obtener('0')).rejects.toMatchObject({
            status: 400,
        });
        expect(query).not.toHaveBeenCalled();
        query.mockResolvedValue([]);
        await expect(servicio.obtener('9')).rejects.toMatchObject({
            status: 404,
        });
    });
    it('rechaza paginación y búsquedas inválidas', async () => {
        await expect(servicio.listar({ limite: '101' })).rejects.toMatchObject({
            status: 400,
        });
        await expect(servicio.listar({ buscar: ['a'] })).rejects.toMatchObject({
            status: 400,
        });
    });
});
