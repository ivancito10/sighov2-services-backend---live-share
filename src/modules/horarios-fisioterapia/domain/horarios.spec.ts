import { contenida, filtros, idValido, validarDatos } from './horarios';

describe('Reglas de horarios semanales', () => {
    const bloque = {
        idAsignacionSede: '1',
        idPoliticaAgenda: '2',
        horaInicio: '07:00',
        horaFin: '13:00',
        intervalo: 30,
    };
    it('normaliza horas y permite vigencia abierta', () => {
        expect(validarDatos('horarios', bloque)).toMatchObject({
            horaInicio: '07:00:00',
            vigenteDesde: null,
            vigenteHasta: null,
        });
    });
    it.each([
        { horaFin: '06:00' },
        { horaInicio: '25:00' },
        { intervalo: 0 },
        { intervalo: 31 },
        { intervalo: '30' },
        { vigenteDesde: '2026-02-30' },
        { vigenteDesde: '0000-01-01' },
        { vigenteDesde: '2026-10-02', vigenteHasta: '2026-10-01' },
        { idAsignacionSede: '2147483648' },
    ])('rechaza bloque inválido %j', (cambio) => {
        expect(() =>
            validarDatos('horarios', { ...bloque, ...cambio }),
        ).toThrow();
    });
    it('no permite vigencia abierta fuera de una política finita', () => {
        expect(() =>
            contenida(
                { vigenteDesde: null, vigenteHasta: null },
                { vigenteDesde: '2026-01-01', vigenteHasta: null },
            ),
        ).toThrow();
    });
    it('conserva IDs bigint y rechaza números inseguros', () => {
        expect(idValido('9223372036854775807')).toBe('9223372036854775807');
        expect(() => idValido(9007199254740992)).toThrow();
    });
    it('interpreta false sin convertirlo a true y limita paginación', () => {
        expect(filtros({ estado: 'false' }, ['estado']).estado).toBe(false);
        expect(() => filtros({ limite: '101' })).toThrow();
    });
});
