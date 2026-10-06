import { UnauthorizedException } from '@nestjs/common';
export function usuarioActor(request: { user?: unknown }): number {
    const id = (request.user as { id?: unknown } | undefined)?.id;
    if (
        (typeof id !== 'string' && typeof id !== 'number') ||
        !/^[1-9]\d*$/.test(String(id)) ||
        !Number.isSafeInteger(Number(id)) ||
        Number(id) > 2147483647
    )
        throw new UnauthorizedException('Identidad del usuario inv�lida');
    return Number(id);
}
