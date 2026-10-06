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
import { SedeError } from '../domain/sede';
import { ConsultarSedesUseCase } from '../application/consultar-sedes.use-case';

@Catch(SedeError)
export class SedeFilter implements ExceptionFilter {
    catch(e: SedeError, host: ArgumentsHost) {
        host.switchToHttp()
            .getResponse<Response>()
            .status(e.status)
            .json({ statusCode: e.status, message: e.message });
    }
}
@Controller('sedes')
@UseFilters(SedeFilter)
export class SedesController {
    constructor(private readonly service: ConsultarSedesUseCase) {}
    @Get()
    listar(@Query() q: Record<string, unknown>) {
        return this.service.listar(q);
    }
    @Get(':id')
    obtener(@Param('id') id: string) {
        return this.service.obtener(id);
    }
}
