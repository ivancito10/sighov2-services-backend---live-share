import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateRegistroInyeccionUseCase } from '../../application/use-cases/create-registro-inyeccion.use-case';
import { GetRegistrosInyeccionPacienteUseCase } from '../../application/use-cases/get-registros-inyeccion-paciente.use-case';
import { CreateRegistroInyeccionDto } from '../../application/dtos/create-registro-inyeccion.dto';

@Controller('enfermeria/inyecciones')
@UseGuards(AuthGuard('jwt'))
export class RegistroInyeccionController {
    constructor(
        private readonly createUseCase: CreateRegistroInyeccionUseCase,
        private readonly getPacienteUseCase: GetRegistrosInyeccionPacienteUseCase,
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
}