import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
// import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { PacienteRepositoryPort } from '../../domain/ports/paciente.repository.port';

@Controller()
// @UseGuards(JwtAuthGuard)
export class PacientesController {
  constructor(private readonly pacienteRepo: PacienteRepositoryPort) { }

  // 1. ENDPOINT HOMOLOGADO CON LARAVEL
  @Get('s1/administracion/pacientes')
  async listarPacientesLaravel(@Query('limite') limite?: number) {
    const data = await this.pacienteRepo.listarPacientesAdministracion(limite ? Number(limite) : 50);
    return {
      status: 200,
      success: true,
      message: 'Peticion pacientes Existosa',
      data,
    };
  }

  // 2. ENDPOINT QUE YA TENÍAS PARA ENFERMERÍA (Se mantiene intacto)
  @Get('pacientes')
  async listarPacientesInterno(@Query('q') query?: string) {
    return await this.pacienteRepo.buscarPacientes(query);
  }

  // 3. OBTENER PACIENTE POR ID
  @Get('pacientes/:id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return await this.pacienteRepo.buscarPorId(id);
  }
}