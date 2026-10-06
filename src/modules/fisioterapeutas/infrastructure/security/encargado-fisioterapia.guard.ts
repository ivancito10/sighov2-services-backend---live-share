import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { RolesFisioterapiaPort } from '../../domain/ports/roles-fisioterapia.port';
@Injectable()
export class EncargadoFisioterapiaGuard implements CanActivate {
    constructor(private readonly roles: RolesFisioterapiaPort) {}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const id: unknown = context
            .switchToHttp()
            .getRequest<{ user?: { id?: unknown } }>().user?.id;
        if (
            (typeof id !== 'string' && typeof id !== 'number') ||
            (typeof id === 'number' && !Number.isSafeInteger(id)) ||
            !/^[1-9]\d{0,18}$/.test(String(id)) ||
            BigInt(String(id)) > 9223372036854775807n
        )
            throw new UnauthorizedException('Identidad del usuario inválida');
        if (!(await this.roles.esEncargado(String(id))))
            throw new ForbiddenException(
                'Se requiere el rol Encargado de Fisioterapia',
            );
        return true;
    }
}
