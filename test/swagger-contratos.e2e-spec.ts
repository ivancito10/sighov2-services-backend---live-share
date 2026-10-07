import { limitarDocumento } from '../src/config/swagger';
import type { OpenAPIObject, SchemaObject, ParameterObject } from '@nestjs/swagger';

describe('Contratos documentados de paginación y errores', () => {
    const documento = () => limitarDocumento({
        openapi: '3.0.0',
        info: { title: 'Prueba', version: '1' },
        paths: Object.fromEntries([
            '/api/pacientes', '/api/pacientes/{id}', '/api/personas/{id}',
            '/api/especialistas/{id}', '/api/sedes/{id}', '/api/auth/login',
            '/api/fisioterapeutas/incorporaciones',
        ].map(path => [path, {
            [path.endsWith('/login') || path.endsWith('/incorporaciones') ? 'post' : 'get']: { responses: {} },
        }])),
    } as OpenAPIObject);

    it('expone los filtros y el contrato data/meta que devuelve pacientes', () => {
        const op = documento().paths['/api/pacientes'].get!;
        const params = op.parameters as ParameterObject[];
        expect(params.map(p => p.name)).toEqual(['page', 'limit', 'ci', 'matricula', 'nombre', 'q']);
        expect(params[0].schema).toMatchObject({ default: 1, minimum: 1 });
        expect(params[1].schema).toMatchObject({ default: 20, minimum: 1 });
        const response = op.responses['200'];
        if (!('content' in response)) throw new Error('Respuesta sin esquema');
        const schema = response.content!['application/json'].schema as SchemaObject;
        expect(Object.keys(schema.properties!)).toEqual(['data', 'meta']);
        expect(Object.keys((schema.properties!.meta as SchemaObject).properties!)).toEqual([
            'total', 'page', 'lastPage', 'limit', 'hasNextPage', 'hasPrevPage',
        ]);
        expect(op.responses).not.toHaveProperty('404');
    });

    it('publica errores aplicables y ejemplos con el código correcto', () => {
        const paths = documento().paths;
        for (const item of Object.values(paths)) {
            const op = item.get ?? item.post!;
            expect(op.responses).toHaveProperty('400');
            expect(op.responses).toHaveProperty('401');
            expect(op.responses).toHaveProperty('500');
            for (const [code, response] of Object.entries(op.responses)) {
                if (Number(code) < 400 || !('content' in response)) continue;
                const schema = response.content!['application/json'].schema as SchemaObject;
                expect(schema.properties!.statusCode).toMatchObject({ example: Number(code) });
            }
        }
        expect(paths['/api/pacientes/{id}'].get!.responses).toHaveProperty('404');
        expect(paths['/api/auth/login'].post!.responses).not.toHaveProperty('404');
        expect(paths['/api/fisioterapeutas/incorporaciones'].post!.responses).toHaveProperty('409');
        expect(paths['/api/fisioterapeutas/incorporaciones'].post!.responses).toHaveProperty('503');
    });
});
