import { Module } from '@nestjs/common';
import { OrdenesPort } from './domain/orden';
import { ConsultarOrdenesUseCase } from './application/consultar-ordenes.use-case';
import { PostgresOrdenesRepository } from './infrastructure/postgres-ordenes.repository';
import { OrdenesController } from './infrastructure/ordenes.controller';

@Module({
    controllers: [OrdenesController],
    providers: [
        { provide: OrdenesPort, useClass: PostgresOrdenesRepository },
        {
            provide: ConsultarOrdenesUseCase,
            inject: [OrdenesPort],
            useFactory: (repo: OrdenesPort) =>
                new ConsultarOrdenesUseCase(repo),
        },
    ],
})
export class OrdenesFisioterapiaModule {}
