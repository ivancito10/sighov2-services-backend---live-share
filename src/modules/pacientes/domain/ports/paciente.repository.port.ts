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
  // 1. Coincidencia exacta (first / getOne) usando índice en clave_unica
  abstract buscarPorCi(ciTermino: string): Promise<Paciente | null>;

  // 2. Búsqueda flexible / parcial / general con paginación (getManyAndCount)
  abstract buscarPacientes(
    filtros: FiltrosBusquedaPaciente,
  ): Promise<PaginatedResult<Paciente>>;

  abstract buscarPorId(idPersona: number): Promise<Paciente | null>;
  abstract listarPacientesAdministracion(limite?: number): Promise<any[]>;
}