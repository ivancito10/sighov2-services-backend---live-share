import { DataSource } from 'typeorm';
import { PostgresHorariosRepository } from './postgres-horarios.repository';

describe('Persistencia de horarios', () => {
    const q1 = jest.fn();
    const q2 = jest.fn();
    const transaction = jest.fn(async (fn) => fn({ query: q2 }));
    const repo = new PostgresHorariosRepository(
        { query: q1 } as unknown as DataSource,
        { query: q2, transaction } as unknown as DataSource,
    );
    const horario = {
        id: '8',
        idEspecialista: 20,
        idAsignacionSede: '1',
        idPoliticaAgenda: '2',
        horaInicio: '07:00:00',
        horaFin: '13:00:00',
        intervalo: 30,
        vigenteDesde: null,
        vigenteHasta: null,
        estado: true,
    };
    beforeEach(() => {
        jest.resetAllMocks();
        transaction.mockImplementation(async (fn) => fn({ query: q2 }));
        q1.mockResolvedValue([{ id: 20, estado: true }]);
        q2.mockImplementation(async (sql: string) => {
            if (sql.includes('WHERE h.id=$1')) return [{ ...horario }];
            if (sql.includes('WHERE a.id=$1'))
                return [
                    {
                        id: '1',
                        idEspecialista: 20,
                        estado: true,
                        vigenteDesde: null,
                        vigenteHasta: null,
                    },
                ];
            if (sql.includes('FROM fisioterapia.politicas_agenda'))
                return [
                    { estado: true, vigenteDesde: null, vigenteHasta: null },
                ];
            if (sql.startsWith('SELECT EXISTS')) return [{ usado: false }];
            if (sql.startsWith('INSERT')) return [{ id: '8' }];
            if (sql.startsWith('UPDATE')) return [[], 1];
            return [];
        });
    });
    it('crea con auditoría y sin dia_semana, verificando cruces entre sedes', async () => {
        await repo.guardar('horarios', null, 20, 17, () => ({
            idAsignacionSede: '1',
            idPoliticaAgenda: '2',
            horaInicio: '07:00:00',
            horaFin: '13:00:00',
            intervalo: 30,
            vigenteDesde: null,
            vigenteHasta: null,
        }));
        const insert = q2.mock.calls.find(([sql]) => sql.startsWith('INSERT'))!;
        expect(insert[0]).not.toContain('dia_semana');
        expect(insert[1]).toContain(17);
        expect(
            q2.mock.calls.some(([sql]) =>
                sql.includes('h.hora_inicio<$4::time'),
            ),
        ).toBe(true);
        expect(transaction).toHaveBeenCalledTimes(1);
    });
    it('lee el registro tras UPDATE, sin confundir la tupla de TypeORM con filas', async () => {
        expect(
            await repo.guardar('horarios', '8', null, 17, () => ({
                estado: false,
            })),
        ).toEqual(horario);
        expect(q2.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(
            true,
        );
        expect(
            q2.mock.calls.some(([sql]) =>
                sql.includes('FROM fisioterapia.politicas_agenda'),
            ),
        ).toBe(false);
    });
    it('devuelve 404 sin escribir cuando no existe el registro', async () => {
        q2.mockResolvedValue([]);
        await expect(
            repo.guardar('horarios', '9', null, 17, () => ({ estado: false })),
        ).rejects.toMatchObject({ status: 404 });
        expect(q2.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(
            false,
        );
    });
    it('rechaza un especialista de otra especialidad sin modificar datos', async () => {
        q1.mockResolvedValue([]);
        await expect(
            repo.guardar('horarios', '8', null, 17, () => ({ estado: false })),
        ).rejects.toMatchObject({ status: 404 });
        expect(q1.mock.calls[0][0]).toContain('id_especialidad=89');
        expect(q2.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(
            false,
        );
    });
    it('no modifica bloques que ya tienen citas', async () => {
        const original = q2.getMockImplementation()!;
        q2.mockImplementation(async (sql, ...args) =>
            sql.startsWith('SELECT EXISTS')
                ? [{ usado: true }]
                : original(sql, ...args),
        );
        await expect(
            repo.guardar('horarios', '8', null, 17, () => ({
                horaInicio: '08:00:00',
            })),
        ).rejects.toMatchObject({ status: 409 });
    });
    it('impide reactivar un horario que se solapa', async () => {
        const original = q2.getMockImplementation()!;
        q2.mockImplementation(async (sql, ...args) =>
            sql.includes('h.hora_inicio<$4::time')
                ? [{ id: '99' }]
                : original(sql, ...args),
        );
        await expect(
            repo.guardar('horarios', '8', null, 17, () => ({ estado: true })),
        ).rejects.toMatchObject({ status: 409 });
        expect(q2.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(
            false,
        );
    });
});
