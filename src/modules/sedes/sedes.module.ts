import { Module } from '@nestjs/common';
import { SedePort } from './domain/sede';
import { ConsultarSedesUseCase } from './application/consultar-sedes.use-case';
import { SedesController } from './infrastructure/sedes.controller';
import { PostgresSedesRepository } from './infrastructure/postgres-sedes.repository';
@Module({
    controllers: [SedesController],
    providers: [
        { provide: SedePort, useClass: PostgresSedesRepository },
        {
            provide: ConsultarSedesUseCase,
            inject: [SedePort],
            useFactory: (repo: SedePort) => new ConsultarSedesUseCase(repo),
        },
    ],
})
export class SedesModule {}
