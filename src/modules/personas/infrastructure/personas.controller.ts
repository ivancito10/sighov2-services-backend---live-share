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
import { PersonaError } from '../domain/persona';
import { ConsultarPersonasUseCase } from '../application/consultar-personas.use-case';

@Catch(PersonaError)
export class PersonaFilter implements ExceptionFilter {
    catch(e: PersonaError, host: ArgumentsHost) {
        host.switchToHttp()
            .getResponse<Response>()
            .status(e.status)
            .json({ statusCode: e.status, message: e.message });
    }
}
@Controller('personas')
@UseFilters(PersonaFilter)
export class PersonasController {
    constructor(private readonly service: ConsultarPersonasUseCase) {}
    @Get()
    listar(@Query() q: Record<string, unknown>) {
        return this.service.listar(q);
    }
    @Get(':id')
    obtener(@Param('id') id: string) {
        return this.service.obtener(id);
    }
}
