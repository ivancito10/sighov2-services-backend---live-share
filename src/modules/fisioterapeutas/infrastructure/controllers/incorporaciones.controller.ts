import {
    Body,
    Controller,
    Header,
    Post,
    Req,
    UseFilters,
} from '@nestjs/common';
import type { Request } from 'express';
import { usuarioActor } from '../../../../common/http/usuario-actor';
import { IncorporarFisioterapeutaUseCase } from '../../application/use-cases/incorporar-fisioterapeuta.use-case';
import { IncorporarFisioterapeutaDto } from '../http/incorporar-fisioterapeuta.dto';
import { RegistroFisioterapeutaFilter } from '../http/registro-fisioterapeuta.filter';
@Controller('fisioterapeutas/incorporaciones')
@UseFilters(RegistroFisioterapeutaFilter)
export class IncorporacionesController {
    constructor(private readonly servicio: IncorporarFisioterapeutaUseCase) {}
    @Post()
    @Header('Cache-Control', 'no-store')
    @Header('Pragma', 'no-cache')
    incorporar(@Body() body: IncorporarFisioterapeutaDto, @Req() req: Request) {
        return this.servicio.ejecutar(body, usuarioActor(req));
    }
}