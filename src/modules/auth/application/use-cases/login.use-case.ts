import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserAuthRepositoryPort } from '../../domain/ports/user-auth.repository.port';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class LoginUseCase {
    constructor(
        private readonly userRepo: UserAuthRepositoryPort,
        private readonly jwtService: JwtService,
    ) {}

    async ejecutar(dto: LoginDto) {
        const user = await this.userRepo.buscarPorCredencial(dto.username);

        if (!user || !user.estaActivo()) {
            throw new UnauthorizedException('Credenciales inválidas o usuario inactivo');
        }

        const match = await bcrypt.compare(dto.password, user.passwordHash);
        if (!match) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        await this.userRepo.actualizarUltimoLogin(user.id);

        const payload = {
            sub: user.id,
            username: user.username,
            idPersona: user.idPersona,
            nombreCompleto: user.nombreCompleto,
            idEspecialista: user.idEspecialista,
        };

        return {
            accessToken: this.jwtService.sign(payload),
            tokenType: 'Bearer',
            usuario: {
                id: user.id,
                username: user.username,
                id_persona: user.idPersona,
                nombreCompleto: user.nombreCompleto,
                idEspecialista: user.idEspecialista,
            },
        };
    }
}