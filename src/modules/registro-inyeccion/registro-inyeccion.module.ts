import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../config/database.constants';
import { RegistroInyeccionController } from './infrastructure/controllers/registro-inyeccion.controller';
import { CreateRegistroInyeccionUseCase } from './application/use-cases/create-registro-inyeccion.use-case';
import { GetRegistrosInyeccionPacienteUseCase } from './application/use-cases/get-registros-inyeccion-paciente.use-case';
import { RegistroInyeccionRepositoryPort } from './domain/ports/registro-inyeccion.repository.port';
import { PostgresRegistroInyeccionRepository } from './infrastructure/persistence/postgres-registro-inyeccion.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([], DB_CONNECTIONS.ETAPA2), // Base de datos Etapa 2
    ],
    controllers: [RegistroInyeccionController],
    providers: [
        CreateRegistroInyeccionUseCase,
        GetRegistrosInyeccionPacienteUseCase,
        {
            provide: RegistroInyeccionRepositoryPort,
            useClass: PostgresRegistroInyeccionRepository,
        },
    ],
    exports: [RegistroInyeccionRepositoryPort],
})
export class RegistroInyeccionModule { }