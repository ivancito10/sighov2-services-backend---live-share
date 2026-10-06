import { DataSource } from 'typeorm';
import { PostgresOrdenesRepository } from './postgres-ordenes.repository';
import { ConsultarOrdenesUseCase } from '../application/consultar-ordenes.use-case';

describe('Consulta de órdenes entre etapas', () => {
    const q1 = jest.fn();
    const q2 = jest.fn();
    const repo = new PostgresOrdenesRepository(
        { query: q2 } as unknown as DataSource,
        { query: q1 } as unknown as DataSource,
    );
    const service = new ConsultarOrdenesUseCase(repo);
    const orden = {
        id: '9007199254740993',
        nro_solicitud: 15,
        nro_sesion: 10,
        indicaciones: 'Ejercicios',
        id_persona: 31,
        id_user_created: '72',
    };
    beforeEach(() => {
        jest.resetAllMocks();
        q2.mockImplementation(async (sql: string) =>
            sql.includes('COUNT(*)')
                ? [{ total: '2' }]
                : [orden, { ...orden, id: '2' }],
        );
        q1.mockImplementation(async (sql: string) =>
            sql.includes('FROM administracion.users')
                ? [
                      {
                          id_user: '72',
                          id_persona: 90,
                          persona: { id: 90, nombres: 'Medico' },
                          especialistas: [
                              {
                                  id: 7,
                                  especialidad: {
                                      id: 3,
                                      nombre: 'TRAUMATOLOGIA',
                                  },
                              },
                          ],
                      },
                  ]
                : [{ id: 31, nombres: 'Paciente' }],
        );
    });
    it('consulta órdenes en etapa2 y completa por lotes con etapa1 sin duplicarlas', async () => {
        const r = await service.listar({});
        expect(r.datos).toHaveLength(2);
        expect(r.datos[0]).toMatchObject({
            ...orden,
            paciente: { id: 31 },
            emisor: {
                id_user: '72',
                persona: { id: 90 },
                especialistas: [{ id: 7 }],
            },
        });
        expect(q1).toHaveBeenCalledTimes(2);
        expect(q1.mock.calls[0][1]).toEqual([[31]]);
        expect(q2.mock.calls[0][0]).toContain(
            'consulta_externa.sol_fisioterapia',
        );
        expect(q2.mock.calls[0][1]).toEqual([20, 0]);
        const sql = q1.mock.calls[1][0];
        expect(sql).toContain('e.id_persona=u.id_persona');
        expect(sql).not.toContain('id_especialidad=89');
        expect(sql).not.toContain('password');
    });
    it('conserva órdenes con relaciones ausentes', async () => {
        q1.mockResolvedValue([]);
        const r = await service.listar({});
        expect(r.datos[0]).toMatchObject({
            ...orden,
            paciente: null,
            emisor: null,
        });
    });
    it('busca por PK bigint y devuelve 404 sin consultar etapa1 si no existe', async () => {
        q2.mockResolvedValue([]);
        await expect(service.obtener(orden.id)).rejects.toMatchObject({
            status: 404,
        });
        expect(q2).toHaveBeenCalledWith(
            expect.stringContaining('WHERE id=$1'),
            [orden.id],
        );
        expect(q1).not.toHaveBeenCalled();
    });
    it.each(['0', '-1', 'abc', '9223372036854775808', '1 OR 1=1'])(
        'rechaza ID inválido %s antes de consultar',
        async (id) => {
            await expect(service.obtener(id)).rejects.toMatchObject({
                status: 400,
            });
            expect(q2).not.toHaveBeenCalled();
        },
    );
    it('valida paginación', async () => {
        await expect(service.listar({ limite: '101' })).rejects.toMatchObject({
            status: 400,
        });
        await expect(
            service.listar({ pagina: ['1', '2'] }),
        ).rejects.toMatchObject({ status: 400 });
    });
});
