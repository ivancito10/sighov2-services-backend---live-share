import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { RegistroFisioterapeutaError } from '../../domain/errors/registro-fisioterapeuta.error';
@Catch(RegistroFisioterapeutaError)
export class RegistroFisioterapeutaFilter implements ExceptionFilter {
    catch(error: RegistroFisioterapeutaError, host: ArgumentsHost) {
        const status = {
            validacion: 400,
            conflicto: 409,
            configuracion: 503,
            no_encontrado: 404,
        }[error.tipo];
        host.switchToHttp()
            .getResponse<Response>()
            .status(status)
            .json({ statusCode: status, message: error.message });
    }
}
