import { Module } from '@nestjs/common';
import { PersonaPort } from './domain/persona';
import { ConsultarPersonasUseCase } from './application/consultar-personas.use-case';
import { PersonasController } from './infrastructure/personas.controller';
import { PostgresPersonasRepository } from './infrastructure/postgres-personas.repository';
@Module({
    controllers: [PersonasController],
    providers: [
        { provide: PersonaPort, useClass: PostgresPersonasRepository },
        {
            provide: ConsultarPersonasUseCase,
            inject: [PersonaPort],
            useFactory: (repo: PersonaPort) =>
                new ConsultarPersonasUseCase(repo),
        },
    ],
})
export class PersonasModule {}
