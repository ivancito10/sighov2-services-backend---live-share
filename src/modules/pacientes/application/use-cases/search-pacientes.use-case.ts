import { Injectable } from '@nestjs/common';
import { PacienteRepositoryPort } from '../../domain/ports/paciente.repository.port';

@Injectable()
export class SearchPacientesUseCase {
  constructor(private readonly pacienteRepo: PacienteRepositoryPort) { }

  async ejecutar(termino?: string) {
    const busqueda = termino ? termino.trim() : '';
    return await this.pacienteRepo.buscarPacientes(busqueda);
  }
}