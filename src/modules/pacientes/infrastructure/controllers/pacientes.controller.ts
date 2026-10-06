import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { SearchPacientesUseCase } from '../../application/use-cases/search-pacientes.use-case';
import { GetPacienteByIdUseCase } from '../../application/use-cases/get-paciente-by-id.use-case';
import { PacienteRepositoryPort } from '../../domain/ports/paciente.repository.port';
import { PaginationPacienteDto } from '../../application/dtos/search-paciente.dto';

@Controller()
export class PacientesController {
  constructor(
    private readonly searchPacientesUseCase: SearchPacientesUseCase,
    private readonly getPacienteByIdUseCase: GetPacienteByIdUseCase,
    private readonly pacienteRepo: PacienteRepositoryPort,
  ) {}

  // Búsqueda paginada
  @Get('pacientes')
  async listarPacientesInterno(@Query() queryDto: PaginationPacienteDto) {
    return await this.searchPacientesUseCase.ejecutar(queryDto);
  }

  // Detalle por ID (mantiene resolución completa de instituciones)
  @Get('pacientes/:id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return await this.getPacienteByIdUseCase.ejecutar(id);
  }

  // Compatibilidad Laravel
  @Get('s1/administracion/pacientes')
  async listarPacientesLaravel(@Query('limite') limite?: number) {
    const data = await this.pacienteRepo.listarPacientesAdministracion(
      limite ? Number(limite) : 50,
    );
    return {
      status: 200,
      success: true,
      message: 'Peticion pacientes Exitosa',
      data,
    };
  }
}