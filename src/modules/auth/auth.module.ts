import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DB_CONNECTIONS } from '../../config/database.constants'; // <-- Importar constantes
import { AuthController } from './infrastructure/controllers/auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { UserAuthRepositoryPort } from './domain/ports/user-auth.repository.port';
import { PostgresUserAuthRepository } from './infrastructure/persistence/postgres-user-auth.repository';
import { JwtStrategy } from './infrastructure/jwt/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'CLAVE_SECRETA_INSTITUCIONAL_SSU_2026',
        signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '8h') as any },
      }),
    }),
    TypeOrmModule.forFeature([], DB_CONNECTIONS.SIGHOV), // <-- Usar constante
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    JwtStrategy,
    {
      provide: UserAuthRepositoryPort,
      useClass: PostgresUserAuthRepository,
    },
  ],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}