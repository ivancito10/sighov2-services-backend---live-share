import { DataSource } from 'typeorm';
import { entidadesEtapa1 } from '../../../common/persistence/orm/entities';
import { personasQuery } from '../../../common/persistence/orm/lecturas';
import { filtrarPersonas } from './filtros-personas';
import type { FiltroPersona } from '../domain/persona';

describe('Filtros ORM de personas sin conexión a la base', () => {
    const db = new DataSource({ type: 'postgres', entities: entidadesEtapa1 });
    beforeAll(async () => {
        await (
            db as unknown as { buildMetadatas(): Promise<void> }
        ).buildMetadatas();
    });
    const query = (f: Partial<FiltroPersona>) =>
        filtrarPersonas(personasQuery(db), {
            pagina: 1,
            limite: 20,
            buscar: '',
            ...f,
        }).getQueryAndParameters();
    it.each([{ ci: '123456' }, { buscar: '123456' }])(
        'ancla el CI al inicio %j',
        (f) => {
            const [sql, params] = query(f);
            expect(params).toEqual(['123456%']);
            expect(sql).not.toContain('123456');
        },
    );
    it('compara CI y complemento completos', () => {
        expect(query({ ci: '123456', complemento: '1A' })[1]).toEqual([
            '123456',
            '1A',
        ]);
    });
    it('permite matrícula numérica sin interpretarla como CI', () => {
        expect(query({ matricula: '123456' })[1]).toEqual(['%123456%']);
    });
    it('combina documento y palabras de nombre', () => {
        expect(query({ ci: '123', nombre: 'Ana Perez' })[1]).toEqual([
            '123%',
            '%Ana%',
            '%Ana%',
            '%Ana%',
            '%Perez%',
            '%Perez%',
            '%Perez%',
        ]);
    });
    it('escapa comodines del usuario', () => {
        expect(query({ ci: '12%_' })[1]).toEqual(['12\\%\\_%']);
    });
});
