import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    Req,
    UseFilters,
    Catch,
    ArgumentsHost,
    ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { GestionarHorariosUseCase } from '../application/gestionar-horarios.use-case';
import { HorarioError } from '../domain/horarios';
import { usuarioActor } from '../../../common/http/usuario-actor';
@Catch(HorarioError)
export class HorarioFilter implements ExceptionFilter {
    catch(e: HorarioError, h: ArgumentsHost) {
        h.switchToHttp()
            .getResponse<Response>()
            .status(e.status)
            .json({ statusCode: e.status, message: e.message });
    }
}
@Controller()
@UseFilters(HorarioFilter)
export class HorariosController {
    constructor(private readonly service: GestionarHorariosUseCase) {}
    @Get('sedes') sedes(@Query() q: Record<string, unknown>) {
        return this.service.sedes(q);
    }
    @Get('personas') personas(@Query() q: Record<string, unknown>) {
        return this.service.personas(q);
    }
    @Get('fisioterapeutas/:id/asignaciones-sede') asignaciones(
        @Param('id') id: string,
        @Query() q: Record<string, unknown>,
    ) {
        return this.service.listar('asignaciones', id, q);
    }
    @Post('fisioterapeutas/:id/asignaciones-sede') crearAsignacion(
        @Param('id') id: string,
        @Body() b: unknown,
        @Req() req: Request,
    ) {
        return this.service.crear('asignaciones', id, b, usuarioActor(req));
    }
    @Get('asignaciones-sede/:id') asignacion(@Param('id') id: string) {
        return this.service.obtener('asignaciones', id);
    }
    @Patch('asignaciones-sede/:id') editarAsignacion(
        @Param('id') id: string,
        @Body() b: unknown,
        @Req() req: Request,
    ) {
        return this.service.editar('asignaciones', id, b, usuarioActor(req));
    }
    @Patch('asignaciones-sede/:id/estado') estadoAsignacion(
        @Param('id') id: string,
        @Body() b: unknown,
        @Req() req: Request,
    ) {
        return this.service.estado('asignaciones', id, b, usuarioActor(req));
    }
    @Post('fisioterapeutas/:id/horarios-semanales') crearHorario(
        @Param('id') id: string,
        @Body() b: unknown,
        @Req() req: Request,
    ) {
        return this.service.crear('horarios', id, b, usuarioActor(req));
    }
    @Get('fisioterapeutas/:id/horarios-semanales/administracion') horarios(
        @Param('id') id: string,
        @Query() q: Record<string, unknown>,
    ) {
        return this.service.listar('horarios', id, q);
    }
    @Get('horarios-semanales/:id') horario(@Param('id') id: string) {
        return this.service.obtener('horarios', id);
    }
    @Patch('horarios-semanales/:id') editarHorario(
        @Param('id') id: string,
        @Body() b: unknown,
        @Req() req: Request,
    ) {
        return this.service.editar('horarios', id, b, usuarioActor(req));
    }
    @Patch('horarios-semanales/:id/estado') estadoHorario(
        @Param('id') id: string,
        @Body() b: unknown,
        @Req() req: Request,
    ) {
        return this.service.estado('horarios', id, b, usuarioActor(req));
    }
}
