import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../config/database.constants';
import { MedicamentosController } from './infrastructure/controllers/medicamentos.controller';
import { SearchMedicamentosUseCase } from './application/use-cases/search-medicamentos.use-case';
import { GetMedicamentoByIdUseCase } from './application/use-cases/get-medicamento-by-id.use-case';
import { MedicamentoRepositoryPort } from './domain/ports/medicamento.repository.port';
import { PostgresMedicamentoRepository } from './infrastructure/persistence/postgres-medicamento.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([], DB_CONNECTIONS.ETAPA2), // <-- ETAPA2
    ],
    controllers: [MedicamentosController],
    providers: [
        SearchMedicamentosUseCase,
        GetMedicamentoByIdUseCase,
        {
            provide: MedicamentoRepositoryPort,
            useClass: PostgresMedicamentoRepository,
        },
    ],
    exports: [MedicamentoRepositoryPort],
})
export class MedicamentosModule { }