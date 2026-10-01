import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateRecetaManualUseCase } from '../../application/use-cases/create-receta-manual.use-case';
import { GetRecetasManualesPacienteUseCase } from '../../application/use-cases/get-recetas-manuales-paciente.use-case';
import { CreateRecetaManualDto } from '../../application/dtos/create-receta-manual.dto';

@Controller('enfermeria/recetas-manuales')
@UseGuards(AuthGuard('jwt'))
export class RecetaManualController {
    constructor(
        private readonly createUseCase: CreateRecetaManualUseCase,
        private readonly getPacienteUseCase: GetRecetasManualesPacienteUseCase,
    ) { }

    @Post()
    async crear(@Body() dto: CreateRecetaManualDto, @Req() req: any) {
        const idUsuario = req.user?.id;
        return await this.createUseCase.ejecutar(dto, idUsuario);
    }

    @Get('paciente/:idPersona')
    async listarPorPaciente(@Param('idPersona', ParseIntPipe) idPersona: number) {
        return await this.getPacienteUseCase.ejecutar(idPersona);
    }
}