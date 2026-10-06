import {
    Controller,
    Get,
    Param,
    Query,
    Catch,
    UseFilters,
} from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { OrdenError } from '../domain/orden';
import { ConsultarOrdenesUseCase } from '../application/consultar-ordenes.use-case';

@Catch(OrdenError)
export class OrdenFilter implements ExceptionFilter {
    catch(e: OrdenError, host: ArgumentsHost) {
        host.switchToHttp()
            .getResponse<Response>()
            .status(e.status)
            .json({ statusCode: e.status, message: e.message });
    }
}
@Controller('ordenes-fisioterapia')
@UseFilters(OrdenFilter)
export class OrdenesController {
    constructor(private readonly service: ConsultarOrdenesUseCase) {}
    @Get()
    listar(@Query() q: Record<string, unknown>) {
        return this.service.listar(q);
    }
    @Get(':id')
    obtener(@Param('id') id: string) {
        return this.service.obtener(id);
    }
}
