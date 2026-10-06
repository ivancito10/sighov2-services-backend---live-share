import { Module } from '@nestjs/common';
import { HorariosPort } from './domain/horarios';
import { GestionarHorariosUseCase } from './application/gestionar-horarios.use-case';
import { PostgresHorariosRepository } from './infrastructure/postgres-horarios.repository';
import { HorariosController } from './infrastructure/horarios.controller';
@Module({
    controllers: [HorariosController],
    providers: [
        { provide: HorariosPort, useClass: PostgresHorariosRepository },
        {
            provide: GestionarHorariosUseCase,
            inject: [HorariosPort],
            useFactory: (repo: HorariosPort) =>
                new GestionarHorariosUseCase(repo),
        },
    ],
})
export class HorariosFisioterapiaModule {}
