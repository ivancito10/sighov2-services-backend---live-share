import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UserAuthRepositoryPort } from '../src/modules/auth/domain/ports/user-auth.repository.port';
import { SedesModule } from '../src/modules/sedes/sedes.module';
import { SedePort } from '../src/modules/sedes/domain/sede';
describe('Sedes HTTP', () => {
    let app: INestApplication;
    let token: string;
    const sede = {
        id: 1,
        piso: '2',
        ubicacion: 'Central',
        id_residencia: 7,
        residencia: 'Av. 6 de Agosto',
    };
    const repo = { listar: jest.fn(), obtener: jest.fn() };
    beforeAll(async () => {
        const m = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    ignoreEnvFile: true,
                    ignoreEnvVars: true,
                    skipProcessEnv: true,
                    load: [
                        () => ({
                            JWT_SECRET: 'sedes-test-secret-123456789',
                            JWT_EXPIRES_IN: '8h',
                        }),
                    ],
                }),
                AuthModule,
                SedesModule,
            ],
        })
            .overrideProvider(UserAuthRepositoryPort)
            .useValue({})
            .overrideProvider(SedePort)
            .useValue(repo)
            .compile();
        app = m.createNestApplication();
        app.setGlobalPrefix('api');
        await app.init();
        token = m.get(JwtService).sign({ sub: '17' });
    });
    beforeEach(() => {
        repo.listar.mockResolvedValue({ datos: [sede], total: 1 });
        repo.obtener.mockResolvedValue(sede);
    });
    afterAll(async () => app.close());
    it.each(['/api/sedes', '/api/sedes/1'])(
        'exige token en %s',
        async (url) => {
            await request(app.getHttpServer()).get(url).expect(401);
        },
    );
    it('devuelve listado y detalle con residencia', async () => {
        const r = await request(app.getHttpServer())
            .get('/api/sedes')
            .set('Authorization', 'Bearer ' + token)
            .expect(200);
        expect(r.body.datos).toEqual([sede]);
        await request(app.getHttpServer())
            .get('/api/sedes/1')
            .set('Authorization', 'Bearer ' + token)
            .expect(200, sede);
    });
    it('responde 404 cuando no existe', async () => {
        repo.obtener.mockResolvedValue(null);
        await request(app.getHttpServer())
            .get('/api/sedes/99')
            .set('Authorization', 'Bearer ' + token)
            .expect(404);
    });
});
