import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'CLAVE_SECRETA_INSTITUCIONAL_SSU_2026',
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      username: payload.username,
      idPersona: payload.idPersona,
      nombreCompleto: payload.nombreCompleto,
      idEspecialista: payload.idEspecialista,
    };
  }
}