import { Injectable, NotFoundException } from '@nestjs/common';
import { PacienteRepositoryPort } from '../../domain/ports/paciente.repository.port';

@Injectable()
export class GetPacienteByIdUseCase {
  constructor(private readonly pacienteRepo: PacienteRepositoryPort) { }

  async ejecutar(idPersona: number) {
    const paciente = await this.pacienteRepo.buscarPorId(idPersona);
    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${idPersona} no encontrado`);
    }
    return paciente;
  }
}