import { Injectable } from '@nestjs/common';
import { PacienteRepositoryPort } from '../../domain/ports/paciente.repository.port';
import { PaginatedResult } from '../../domain/ports/paginated-result.interface';
import { Paciente } from '../../domain/entities/paciente.entity';
import { PaginationPacienteDto } from '../dtos/search-paciente.dto';

@Injectable()
export class SearchPacientesUseCase {
  constructor(private readonly pacienteRepo: PacienteRepositoryPort) {}

  async ejecutar(dto: PaginationPacienteDto): Promise<PaginatedResult<Paciente>> {
    return await this.pacienteRepo.buscarPacientes({
      q: dto.q,
      ci: dto.ci,
      matricula: dto.matricula,
      nombre: dto.nombre,
      page: dto.page,
      limit: dto.limit,
    });
  }
}