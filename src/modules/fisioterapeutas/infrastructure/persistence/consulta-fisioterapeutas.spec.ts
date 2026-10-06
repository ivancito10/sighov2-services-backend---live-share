import { DataSource } from 'typeorm';
import { PostgresConsultaFisioterapeutasRepository } from './postgres-consulta-fisioterapeutas.repository';
import { PostgresRolesFisioterapiaRepository } from './postgres-roles-fisioterapia.repository';
import { ConfigService } from '@nestjs/config';
describe('Lectura fisioterapeutas: separación de bases', () => {
    const primera = { query: jest.fn() },
        segunda = { query: jest.fn() };
    const repo = new PostgresConsultaFisioterapeutasRepository(
        primera as unknown as DataSource,
        segunda as unknown as DataSource,
    );
    beforeEach(() => jest.resetAllMocks());
    it('pagina y busca solo especialidad 89 sin excluir inactivos', async () => {
        primera.query
            .mockResolvedValueOnce([
                { idEspecialista: 20, idPersona: 91, estado: false },
            ])
            .mockResolvedValueOnce([{ total: '21' }]);
        segunda.query.mockRejectedValue(
            new Error('42P01: no existe fisioterapia.especialistas'),
        );
        const result = await repo.listar({
            buscar: "100%_x'",
            pagina: 2,
            limite: 20,
        });
        expect(result.total).toBe(21);
        expect(result.datos[0].estado).toBe(false);
        const [sql, args] = primera.query.mock.calls[0];
        expect(sql).toContain('e.id_especialidad=89');
        expect(sql).not.toContain('e.estado=true');
        expect(sql).not.toContain("100%_x'");
        expect(args).toEqual(["%100\\%\\_x'%", 20, 20]);
        expect(segunda.query).not.toHaveBeenCalled();
        expect(sql).toContain('p.fecha_nacimiento::text');
        expect(sql).toContain('e.grado_academico');
        expect(sql).toContain('AS expedido');
        expect(sql).toContain('e.foto');
        expect(sql).toContain('p.es_extranjero AS "esExtranjero"');
    });
    it('consulta horarios por ID exacto del especialista de fisioterapia', async () => {
        segunda.query.mockResolvedValue([]);
        await repo.horarios('400');
        const [sql, args] = segunda.query.mock.calls[0];
        expect(args).toEqual(['400']);
        expect(sql).toContain('a.id_especialista=$1');
        expect(sql).not.toContain('dia_semana');
        expect(sql).not.toContain('fisioterapia.especialistas');
        expect(sql).toContain('a.id_sede AS "idSede"');
        expect(sql).toContain('h.estado=true');
        expect(sql).toContain('a.estado=true');
        expect(sql).toContain('pa.estado=true');
        expect(sql).toContain('CURRENT_DATE');
        expect(primera.query).not.toHaveBeenCalled();
    });
    it('busca por ID de plataforma sin consultar etapa2', async () => {
        primera.query.mockResolvedValue([
            { idEspecialista: 20, idPersona: 91 },
        ]);
        expect(await repo.buscar('20')).toEqual({
            idEspecialista: 20,
            idPersona: 91,
        });
        expect(primera.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE e.id=$1'),
            ['20'],
        );
        expect(segunda.query).not.toHaveBeenCalled();
    });
    it('resuelve sedes en etapa1 y no consulta una lista vacía', async () => {
        expect(await repo.sedes([])).toEqual([]);
        expect(primera.query).not.toHaveBeenCalled();
        primera.query.mockResolvedValue([
            { id: 6, piso: '2', ubicacion: 'Av. 6 de Agosto' },
        ]);
        await repo.sedes([6]);
        expect(primera.query).toHaveBeenCalledWith(
            expect.stringContaining('plataforma.sedes'),
            [[6]],
        );
    });
    it('detalle restringido a fisioterapia y sin datos de cuenta', async () => {
        primera.query.mockResolvedValue([]);
        segunda.query.mockResolvedValue([{ id: '400', idPersona: 91 }]);
        expect(await repo.buscar('400')).toBeNull();
        expect(primera.query.mock.calls[0][1]).toEqual(['400']);
        expect(primera.query.mock.calls[0][0]).toContain(
            'e.id_especialidad=89',
        );
        expect(primera.query.mock.calls[0][0]).not.toContain('users');
    });
});
describe('Roles desde PostgreSQL', () => {
    const source = { query: jest.fn() };
    beforeEach(() => jest.resetAllMocks());
    it('rechaza configuración incompleta antes de consultar', async () => {
        const repo = new PostgresRolesFisioterapiaRepository(
            source as unknown as DataSource,
            new ConfigService(),
        );
        await expect(repo.esEncargado('17')).rejects.toThrow('Configurar');
        expect(source.query).not.toHaveBeenCalled();
    });
    it('requiere usuario activo, rol habilitado y tipo/guard exactos', async () => {
        const repo = new PostgresRolesFisioterapiaRepository(
            source as unknown as DataSource,
            new ConfigService({
                FISIOTERAPIA_USER_MODEL_TYPE: 'App\\Models\\User',
                FISIOTERAPIA_ROLE_GUARD: 'web',
            }),
        );
        source.query.mockResolvedValueOnce([{}]).mockResolvedValueOnce([]);
        expect(await repo.esEncargado('17')).toBe(true);
        expect(await repo.esEncargado('17')).toBe(false);
        const [sql, args] = source.query.mock.calls[0];
        expect(args).toEqual([
            '17',
            'App\\Models\\User',
            'web',
            'Encargado de Fisioterapia',
        ]);
        expect(sql).toContain('mr.model_type=$2');
        expect(sql).toContain('r.guard_name=$3');
        expect(sql).toContain('r.role_enabled=true');
        expect(sql).toContain('u.estado=true');
    });
});
