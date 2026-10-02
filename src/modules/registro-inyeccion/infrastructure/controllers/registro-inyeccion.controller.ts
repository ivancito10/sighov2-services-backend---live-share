import { Controller, Post, Get, Patch, Put, Body, Param, ParseIntPipe, Query, NotFoundException, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateRegistroInyeccionUseCase } from '../../application/use-cases/create-registro-inyeccion.use-case';
import { GetRegistrosInyeccionPacienteUseCase } from '../../application/use-cases/get-registros-inyeccion-paciente.use-case';
import { RegistroInyeccionRepositoryPort } from '../../domain/ports/registro-inyeccion.repository.port';
import { CreateRegistroInyeccionDto } from '../../application/dtos/create-registro-inyeccion.dto';
import { UpdateRegistroInyeccionDto } from '../../application/dtos/update-registro-inyeccion.dto';


@Controller('enfermeria/inyecciones')
@UseGuards(AuthGuard('jwt'))
export class RegistroInyeccionController {
    constructor(
        private readonly createUseCase: CreateRegistroInyeccionUseCase,
        private readonly getPacienteUseCase: GetRegistrosInyeccionPacienteUseCase,
        private readonly inyeccionRepo: RegistroInyeccionRepositoryPort,
    ) { }

    @Post()
    async registrar(@Body() dto: CreateRegistroInyeccionDto, @Req() req: any) {
        const idUsuario = req.user?.id;
        return await this.createUseCase.ejecutar(dto, idUsuario);
    }

    @Get('paciente/:idPersona')
    async listarPorPaciente(@Param('idPersona', ParseIntPipe) idPersona: number) {
        return await this.getPacienteUseCase.ejecutar(idPersona);
    }

    // GET /api/enfermeria/inyecciones?buscar=JUAN
    @Get()
    async listarRegistros(
        @Query('buscar') buscar?: string,
        @Query('limite') limite?: number,
    ) {
        const data = await this.inyeccionRepo.listarRegistros(
            buscar,
            limite ? Number(limite) : 50,
        );
        return {
            status: 200,
            success: true,
            data,
        };
    }

    // GET /api/enfermeria/inyecciones/:id (Para el botón Ver u Editar)
    @Get(':id')
    async obtenerDetalle(@Param('id', ParseIntPipe) id: number) {
        const data = await this.inyeccionRepo.obtenerDetalleCompleto(id);
        if (!data) {
            throw new NotFoundException(`No se encontró el registro de inyección #${id}`);
        }
        return {
            status: 200,
            success: true,
            data,
        };
    }

    // PATCH /api/enfermeria/inyecciones/:id/estado (Para activar/anular)
    @Patch(':id/estado')
    async cambiarEstado(
        @Param('id', ParseIntPipe) id: number,
        @Body('estado') estado: boolean,
        @Req() req: any,
    ) {
        const idUsuario = req.user?.id;
        const actualizado = await this.inyeccionRepo.cambiarEstado(
            id,
            estado,
            idUsuario,
        );
        return {
            status: 200,
            success: actualizado,
            message: estado
                ? 'Registro activado'
                : 'Registro anulado correctamente',
        };
    }

    // PUT /api/enfermeria/inyecciones/:id (Para guardar la edición desde el botón ✏️)
    @Put(':id')
    async actualizar(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateRegistroInyeccionDto,
        @Req() req: any,
    ) {
        const idUsuario = req.user?.id;
        const actualizado = await this.inyeccionRepo.actualizarTransaccion(id, dto, idUsuario);
        return {
            status: 200,
            success: actualizado,
            message: 'Registro de inyección actualizado correctamente',
        };
    }
}