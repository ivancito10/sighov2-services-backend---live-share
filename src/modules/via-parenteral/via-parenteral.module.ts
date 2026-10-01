import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../config/database.constants'; // <-- Importa la constante
import { ViaParenteralController } from './infrastructure/controllers/via-parenteral.controller';
import { GetViasParenteralesUseCase } from './application/use-cases/get-vias-parenterales.use-case';
import { CreateViaParenteralUseCase } from './application/use-cases/create-via-parenteral.use-case';
import { ToggleViaParenteralUseCase } from './application/use-cases/toggle-via-parenteral.use-case';
import { ViaParenteralRepositoryPort } from './domain/ports/via-parenteral.repository.port';
import { PostgresViaParenteralRepository } from './infrastructure/persistence/postgres-via-parenteral.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([], DB_CONNECTIONS.ETAPA2), // <-- Usa DB_CONNECTIONS.ETAPA2
  ],
  controllers: [ViaParenteralController],
  providers: [
    GetViasParenteralesUseCase,
    CreateViaParenteralUseCase,
    ToggleViaParenteralUseCase,
    {
      provide: ViaParenteralRepositoryPort,
      useClass: PostgresViaParenteralRepository,
    },
  ],
  exports: [ViaParenteralRepositoryPort],
})
export class ViaParenteralModule {}