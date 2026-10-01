import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../config/database.constants';
import { RecetaManualController } from './infrastructure/controllers/receta-manual.controller';
import { CreateRecetaManualUseCase } from './application/use-cases/create-receta-manual.use-case';
import { GetRecetasManualesPacienteUseCase } from './application/use-cases/get-recetas-manuales-paciente.use-case';
import { RecetaManualRepositoryPort } from './domain/ports/receta-manual.repository.port';
import { PostgresRecetaManualRepository } from './infrastructure/persistence/postgres-receta-manual.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([], DB_CONNECTIONS.ETAPA2), // Conexión a Etapa 2
    ],
    controllers: [RecetaManualController],
    providers: [
        CreateRecetaManualUseCase,
        GetRecetasManualesPacienteUseCase,
        {
            provide: RecetaManualRepositoryPort,
            useClass: PostgresRecetaManualRepository,
        },
    ],
    exports: [RecetaManualRepositoryPort],
})
export class RecetaManualModule { }