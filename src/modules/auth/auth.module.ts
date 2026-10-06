import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm'; // <-- 1. Importar TypeOrmModule
import { AuthController } from './infrastructure/controllers/auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { UserAuthRepositoryPort } from './domain/ports/user-auth.repository.port';
import { PostgresUserAuthRepository } from './infrastructure/persistence/postgres-user-auth.repository';
import { JwtStrategy } from './infrastructure/jwt/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/jwt/jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.get<JwtSignOptions['expiresIn']>('JWT_EXPIRES_IN', '8h'),
        },
      }),
    }),
    TypeOrmModule.forFeature([], 'sighov'), // <-- 2. Registrar la conexión 'sighov' aquí
  ],
  controllers: [AuthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    {
      provide: APP_PIPE,
      useFactory: () => new ValidationPipe({ 
        whitelist: true, 
        forbidNonWhitelisted: true, 
        transform: true 
      }),
    },
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
