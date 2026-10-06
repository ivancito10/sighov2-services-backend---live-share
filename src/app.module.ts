import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import {
    sighovDatabaseConfig,
    etapa2DatabaseConfig,
} from './config/database.config';

import { DB_CONNECTIONS } from './config/database.constants';

import { envValidationSchema } from './config/env.validation';
// import { PacientesModule } from './modules/pacientes/pacientes.module';

// Importa tu módulo de Autenticación
import { AuthModule } from './modules/auth/auth.module';

//import { PacientesModule } from './modules/pacientes/pacientes.module';
// Si tienen módulos activos (ej. pacientes), impórtalos aquí también:
import { EspecialistasModule } from './modules/especialistas/especialistas.module';
import { FisioterapeutasModule } from './modules/fisioterapeutas/fisioterapeutas.module';
import { MedicamentosModule } from './modules/medicamentos/medicamentos.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { PersonasModule } from './modules/personas/personas.module';
import { SedesModule } from './modules/sedes/sedes.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
    imports: [
        // ObserveModule.forRoot({
        //     appKey: 'YOUR_APP_KEY',
        //     appSecret: 'YOUR_APP_SECRET',
        //     serviceId: 'server',
        // }),
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            validationSchema: envValidationSchema,
        }),
        TypeOrmModule.forRootAsync({
            name: DB_CONNECTIONS.SIGHOV,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
                sighovDatabaseConfig(configService),
        }),

        TypeOrmModule.forRootAsync({
            name: DB_CONNECTIONS.ETAPA2,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
                etapa2DatabaseConfig(configService),
        }),

        // Registra tus módulos funcionales aquí
        AuthModule,
        PacientesModule,
        EspecialistasModule,
        FisioterapeutasModule,
        MedicamentosModule,
        PersonasModule
    ],
    controllers: [
        AppController
    ],
    providers: [
        AppService
    ],
})
export class AppModule { }
