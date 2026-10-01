import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SearchMedicamentosUseCase } from '../../application/use-cases/search-medicamentos.use-case';
import { GetMedicamentoByIdUseCase } from '../../application/use-cases/get-medicamento-by-id.use-case';
import { SearchMedicamentoDto } from '../../application/dtos/search-medicamento.dto';

@Controller('medicamentos')
@UseGuards(AuthGuard('jwt'))
export class MedicamentosController {
    constructor(
        private readonly searchUseCase: SearchMedicamentosUseCase,
        private readonly getByIdUseCase: GetMedicamentoByIdUseCase,
    ) { }

    @Get()
    async buscar(@Query() dto: SearchMedicamentoDto) {
        return await this.searchUseCase.ejecutar(dto.q);
    }

    @Get(':id')
    async buscarPorId(@Param('id', ParseIntPipe) id: number) {
        return await this.getByIdUseCase.ejecutar(id);
    }
}