import { Patch } from '@nestjs/common';
import { usuarioActor } from '../../../../common/http/usuario-actor';
import { EditarFisioterapeutaUseCase } from '../../application/use-cases/editar-fisioterapeuta.use-case';
import {
    EditarFisioterapeutaDto,
    EstadoFisioterapeutaDto,
} from '../http/editar-fisioterapeuta.dto';
import { ObtenerHorariosFisioterapeutaUseCase } from '../../application/use-cases/obtener-horarios-fisioterapeuta.use-case';
import { Query, Param } from '@nestjs/common';
import { ListarFisioterapeutasUseCase } from '../../application/use-cases/listar-fisioterapeutas.use-case';
import { ObtenerFisioterapeutaUseCase } from '../../application/use-cases/obtener-fisioterapeuta.use-case';
import {
    ListarFisioterapeutasDto,
    IdFisioterapeutaDto,
} from '../http/listar-fisioterapeutas.dto';
import {
    Body,
    Controller,
    Get,
    Header,
    Post,
    Req,
    UnauthorizedException,
    UseFilters,
} from '@nestjs/common';
import type { Request } from 'express';
import { CrearFisioterapeutaUseCase } from '../../application/use-cases/crear-fisioterapeuta.use-case';
import { ObtenerCatalogosFisioterapeutasUseCase } from '../../application/use-cases/obtener-catalogos.use-case';
import { CrearFisioterapeutaDto } from '../http/crear-fisioterapeuta.dto';
import { RegistroFisioterapeutaFilter } from '../http/registro-fisioterapeuta.filter';
@Controller('fisioterapeutas')
@UseFilters(RegistroFisioterapeutaFilter)
export class FisioterapeutasController {
    constructor(
        private readonly modificar: EditarFisioterapeutaUseCase,
        private readonly obtenerHorarios: ObtenerHorariosFisioterapeutaUseCase,
        private readonly crear: CrearFisioterapeutaUseCase,
        private readonly listar: ListarFisioterapeutasUseCase,
        private readonly obtener: ObtenerFisioterapeutaUseCase,
        private readonly obtenerCatalogos: ObtenerCatalogosFisioterapeutasUseCase,
    ) {}
    @Get('catalogos') catalogos() {
        return this.obtenerCatalogos.ejecutar();
    }
    @Get() listado(@Query() query: ListarFisioterapeutasDto) {
        return this.listar.ejecutar(query);
    }
    @Get(':id/horarios-semanales') horarios(
        @Param() params: IdFisioterapeutaDto,
    ) {
        return this.obtenerHorarios.ejecutar(params.id);
    }
    @Get(':id') detalle(@Param() params: IdFisioterapeutaDto) {
        return this.obtener.ejecutar(params.id);
    }
    @Patch(':id/estado') estado(
        @Param('id') id: string,
        @Body() body: EstadoFisioterapeutaDto,
        @Req() req: Request,
    ) {
        return this.modificar.estado(id, body.estado, usuarioActor(req));
    }
    @Patch(':id') editar(
        @Param('id') id: string,
        @Body() body: EditarFisioterapeutaDto,
        @Req() req: Request,
    ) {
        return this.modificar.editar(id, body, usuarioActor(req));
    }
    @Post()
    @Header('Cache-Control', 'no-store')
    @Header('Pragma', 'no-cache')
    registrar(
        @Body() dto: CrearFisioterapeutaDto,
        @Req() request: Request & { user?: { id?: unknown } },
    ) {
        const raw = request.user?.id;
        if (
            (typeof raw !== 'string' && typeof raw !== 'number') ||
            !/^[1-9]\d*$/.test(String(raw))
        )
            throw new UnauthorizedException('Identidad del usuario inválida');
        const id = Number(raw);
        if (!Number.isSafeInteger(id) || id > 2147483647)
            throw new UnauthorizedException('Identidad del usuario inválida');
        return this.crear.ejecutar(dto, id);
    }
}
