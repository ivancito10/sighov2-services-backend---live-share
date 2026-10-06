import { Paciente } from '../entities/paciente.entity';
import { PaginatedResult } from './paginated-result.interface';

export interface FiltrosBusquedaPaciente {
  q?: string;
  ci?: string;
  matricula?: string;
  nombre?: string;
  page?: number;
  limit?: number;
}

export abstract class PacienteRepositoryPort {
  abstract buscarPacientes(
    filtros: FiltrosBusquedaPaciente,
  ): Promise<PaginatedResult<Paciente>>;

  abstract buscarPorId(idPersona: number): Promise<Paciente | null>;
  abstract listarPacientesAdministracion(limite?: number): Promise<any[]>;
}