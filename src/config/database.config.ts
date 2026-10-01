import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

export const sighovDatabaseConfig = (
    configService: ConfigService,
): TypeOrmModuleOptions => ( {
    type: 'postgres',
    host: configService.getOrThrow<string>('DB_SIGHOV_HOST'),
    port: Number(
        configService.getOrThrow<string>('DB_SIGHOV_PORT'),
    ),

    username: configService.getOrThrow<string>(
        'DB_SIGHOV_USERNAME',
    ),

    password: configService.getOrThrow<string>(
        'DB_SIGHOV_PASSWORD',
    ),

    database: configService.getOrThrow<string>(
        'DB_SIGHOV_DATABASE',
    ),
    autoLoadEntities: true,
    synchronize: false,
    logging: false,
} );

export const etapa2DatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',

  host: configService.getOrThrow<string>('DB_ETAPA2_HOST'),

  port: Number(
    configService.getOrThrow<string>('DB_ETAPA2_PORT'),
  ),

  username: configService.getOrThrow<string>(
    'DB_ETAPA2_USERNAME',
  ),

  password: configService.getOrThrow<string>(
    'DB_ETAPA2_PASSWORD',
  ),

  database: configService.getOrThrow<string>(
    'DB_ETAPA2_DATABASE',
  ),

  autoLoadEntities: true,

  synchronize: false,

  logging: false,
});