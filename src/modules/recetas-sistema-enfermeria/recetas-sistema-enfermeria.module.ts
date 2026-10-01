import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../config/database.constants';
import { RecetasSistemaController } from './infrastructure/controllers/recetas-sistema.controller';
import { GetRecetaSistemaByNumeroUseCase } from './application/use-cases/get-receta-sistema-by-numero.use-case';
import { RecetaSistemaRepositoryPort } from './domain/ports/receta-sistema.repository.port';
import { PostgresRecetaSistemaRepository } from './infrastructure/persistence/postgres-receta-sistema.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([], DB_CONNECTIONS.ETAPA2),
        TypeOrmModule.forFeature([], DB_CONNECTIONS.SIGHOV),
    ],
    controllers: [RecetasSistemaController],
    providers: [
        GetRecetaSistemaByNumeroUseCase,
        {
            provide: RecetaSistemaRepositoryPort,
            useClass: PostgresRecetaSistemaRepository,
        },
    ],
    exports: [RecetaSistemaRepositoryPort],
})
export class RecetasSistemaEnfermeriaModule { }