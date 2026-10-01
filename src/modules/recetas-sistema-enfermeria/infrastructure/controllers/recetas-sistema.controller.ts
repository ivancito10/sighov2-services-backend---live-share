import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetRecetaSistemaByNumeroUseCase } from '../../application/use-cases/get-receta-sistema-by-numero.use-case';

@Controller('enfermeria/recetas-sistema')
@UseGuards(AuthGuard('jwt'))
export class RecetasSistemaController {
    constructor(private readonly getRecetaUseCase: GetRecetaSistemaByNumeroUseCase) { }

    @Get(':numeroReceta')
    async buscarPorNumero(@Param('numeroReceta') numeroReceta: string) {
        return await this.getRecetaUseCase.ejecutar(numeroReceta);
    }
}