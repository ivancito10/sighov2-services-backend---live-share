import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../config/database.constants';
import { EspecialistasController } from './infrastructure/controllers/especialistas.controller';
import { GetEspecialistasActivosUseCase } from './application/use-cases/get-especialistas-activos.use-case';
import { GetEspecialistaByIdUseCase } from './application/use-cases/get-especialista-by-id.use-case';
import { EspecialistaRepositoryPort } from './domain/ports/especialista.repository.port';
import { PostgresEspecialistaRepository } from './infrastructure/persistence/postgres-especialista.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([], DB_CONNECTIONS.SIGHOV), // Conexión a la Fase 1
    ],
    controllers: [EspecialistasController],
    providers: [
        GetEspecialistasActivosUseCase,
        GetEspecialistaByIdUseCase,
        {
            provide: EspecialistaRepositoryPort,
            useClass: PostgresEspecialistaRepository,
        },
    ],
    exports: [EspecialistaRepositoryPort],
})
export class EspecialistasModule {}
