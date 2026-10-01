import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    NotFoundException,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard'; // Ajusta la ruta a tu AuthGuard
import { ListarEspecialistasHabilitadosUseCase } from '../../application/use-cases/listar-especialistas-habilitados.use-case';
import { ObtenerDatosEspecialistaUseCase } from '../../application/use-cases/obtener-datos-especialista.use-case';

@Controller('s1/plataforma')
@UseGuards(JwtAuthGuard)
export class EspecialistasController {
    constructor(
        private readonly listarHabilitadosUseCase: ListarEspecialistasHabilitadosUseCase,
        private readonly obtenerDatosUseCase: ObtenerDatosEspecialistaUseCase,
    ) { }

    // 1. GET /api/s1/plataforma/listar_especialistas_habilitados
    @Get('listar_especialistas_habilitados')
    async listarEspecialistasHabilitados() {
        const data = await this.listarHabilitadosUseCase.execute();
        return {
            status: 200,
            data,
        };
    }

    // 2. GET /api/s1/plataforma/obtener_datos_especialista/:id
    @Get('obtener_datos_especialista/:id')
    async obtenerDatosEspecialista(@Param('id', ParseIntPipe) id: number) {
        const data = await this.obtenerDatosUseCase.execute(id);
        if (!data) {
            throw new NotFoundException(`No se encontró el especialista con ID ${id}`);
        }

        return {
            status: 200,
            success: true,
            message: 'Datos de especialistaz',
            data,
        };
    }
}