import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetViasParenteralesUseCase } from '../../application/use-cases/get-vias-parenterales.use-case';
import { CreateViaParenteralUseCase } from '../../application/use-cases/create-via-parenteral.use-case';
import { ToggleViaParenteralUseCase } from '../../application/use-cases/toggle-via-parenteral.use-case';
import { CreateViaParenteralDto } from '../../application/dtos/create-via-parenteral.dto';

@Controller('enfermeria/vias-parenterales') // <-- Se retiró el "v1/"
@UseGuards(AuthGuard('jwt'))
export class ViaParenteralController {
  constructor(
    private readonly getViasUseCase: GetViasParenteralesUseCase,
    private readonly createViaUseCase: CreateViaParenteralUseCase,
    private readonly toggleViaUseCase: ToggleViaParenteralUseCase,
  ) { }

  @Get()
  async listar(@Query('todos') todos?: string) {
    const soloActivos = todos !== 'true';
    return await this.getViasUseCase.ejecutar(soloActivos);
  }

  @Post()
  async crear(@Body() dto: CreateViaParenteralDto, @Req() req: any) {
    const idUsuario = req.user?.id;
    return await this.createViaUseCase.ejecutar(dto, idUsuario);
  }

  @Patch(':id/toggle')
  async toggleEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado') estado: boolean,
    @Req() req: any,
  ) {
    const idUsuario = req.user?.id;
    return await this.toggleViaUseCase.ejecutar(id, estado, idUsuario);
  }
}