import { EditarFisioterapeutaPort } from './domain/ports/editar-fisioterapeuta.port';
import { IncorporarFisioterapeutaPort } from './domain/ports/incorporar-fisioterapeuta.port';
import { IncorporarFisioterapeutaUseCase } from './application/use-cases/incorporar-fisioterapeuta.use-case';
import { PostgresIncorporarFisioterapeutaRepository } from './infrastructure/persistence/postgres-incorporar-fisioterapeuta.repository';
import { IncorporacionesController } from './infrastructure/controllers/incorporaciones.controller';
import { PostgresEditarFisioterapeutaRepository } from './infrastructure/persistence/postgres-editar-fisioterapeuta.repository';
import { EditarFisioterapeutaUseCase } from './application/use-cases/editar-fisioterapeuta.use-case';
import { ObtenerHorariosFisioterapeutaUseCase } from './application/use-cases/obtener-horarios-fisioterapeuta.use-case';
import { ListarFisioterapeutasUseCase } from './application/use-cases/listar-fisioterapeutas.use-case';
import { ObtenerFisioterapeutaUseCase } from './application/use-cases/obtener-fisioterapeuta.use-case';
import { ConsultaFisioterapeutasPort } from './domain/ports/consulta-fisioterapeutas.port';
import { PostgresConsultaFisioterapeutasRepository } from './infrastructure/persistence/postgres-consulta-fisioterapeutas.repository';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../config/database.constants';
import { FisioterapeutasRepositoryPort } from './domain/ports/fisioterapeutas.repository.port';
import { PasswordHasherPort } from './domain/ports/password-hasher.port';
import { CrearFisioterapeutaUseCase } from './application/use-cases/crear-fisioterapeuta.use-case';
import { ObtenerCatalogosFisioterapeutasUseCase } from './application/use-cases/obtener-catalogos.use-case';
import { PostgresFisioterapeutasRepository } from './infrastructure/persistence/postgres-fisioterapeutas.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { FisioterapeutasController } from './infrastructure/controllers/fisioterapeutas.controller';
@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([], DB_CONNECTIONS.SIGHOV),
    ],
    controllers: [FisioterapeutasController, IncorporacionesController],
    providers: [
        {
            provide: IncorporarFisioterapeutaPort,
            useClass: PostgresIncorporarFisioterapeutaRepository,
        },
        {
            provide: IncorporarFisioterapeutaUseCase,
            inject: [IncorporarFisioterapeutaPort, CrearFisioterapeutaUseCase],
            useFactory: (
                repo: IncorporarFisioterapeutaPort,
                crear: CrearFisioterapeutaUseCase,
            ) => new IncorporarFisioterapeutaUseCase(repo, crear),
        },
        {
            provide: EditarFisioterapeutaPort,
            useClass: PostgresEditarFisioterapeutaRepository,
        },
        {
            provide: EditarFisioterapeutaUseCase,
            inject: [EditarFisioterapeutaPort],
            useFactory: (repo: EditarFisioterapeutaPort) =>
                new EditarFisioterapeutaUseCase(repo),
        },
        {
            provide: ObtenerHorariosFisioterapeutaUseCase,
            inject: [ConsultaFisioterapeutasPort],
            useFactory: (repo: ConsultaFisioterapeutasPort) =>
                new ObtenerHorariosFisioterapeutaUseCase(repo),
        },
        {
            provide: ConsultaFisioterapeutasPort,
            useClass: PostgresConsultaFisioterapeutasRepository,
        },
        {
            provide: ListarFisioterapeutasUseCase,
            inject: [ConsultaFisioterapeutasPort],
            useFactory: (repo: ConsultaFisioterapeutasPort) =>
                new ListarFisioterapeutasUseCase(repo),
        },
        {
            provide: ObtenerFisioterapeutaUseCase,
            inject: [ConsultaFisioterapeutasPort],
            useFactory: (repo: ConsultaFisioterapeutasPort) =>
                new ObtenerFisioterapeutaUseCase(repo),
        },
        {
            provide: FisioterapeutasRepositoryPort,
            useClass: PostgresFisioterapeutasRepository,
        },
        { provide: PasswordHasherPort, useClass: BcryptPasswordHasher },
        {
            provide: CrearFisioterapeutaUseCase,
            inject: [
                FisioterapeutasRepositoryPort,
                PasswordHasherPort,
                ConfigService,
            ],
            useFactory: (
                repository: FisioterapeutasRepositoryPort,
                hasher: PasswordHasherPort,
                config: ConfigService,
            ) =>
                new CrearFisioterapeutaUseCase(repository, hasher, {
                    emailDomain: config.get<string>(
                        'FISIOTERAPEUTAS_EMAIL_DOMAIN',
                        'ssulapaz.org',
                    ),
                    idNacimientoMunicipio: Number(
                        config.get('FISIOTERAPEUTAS_MUNICIPIO_NACIMIENTO', 69),
                    ),
                }),
        },
        {
            provide: ObtenerCatalogosFisioterapeutasUseCase,
            inject: [FisioterapeutasRepositoryPort],
            useFactory: (repository: FisioterapeutasRepositoryPort) =>
                new ObtenerCatalogosFisioterapeutasUseCase(repository),
        },
    ],
    exports: [CrearFisioterapeutaUseCase],
})
export class FisioterapeutasModule {}