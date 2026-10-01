import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../config/database.constants';
import { PacientesController } from './infrastructure/controllers/pacientes.controller';
import { SearchPacientesUseCase } from './application/use-cases/search-pacientes.use-case';
import { GetPacienteByIdUseCase } from './application/use-cases/get-paciente-by-id.use-case';
import { PacienteRepositoryPort } from './domain/ports/paciente.repository.port';
import { PostgresPacienteRepository } from './infrastructure/persistence/postgres-paciente.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([], DB_CONNECTIONS.SIGHOV), // Conexión a la Fase 1
  ],
  controllers: [PacientesController],
  providers: [
    SearchPacientesUseCase,
    GetPacienteByIdUseCase,
    {
      provide: PacienteRepositoryPort,
      useClass: PostgresPacienteRepository,
    },
  ],
  exports: [PacienteRepositoryPort],
})
export class PacientesModule { }