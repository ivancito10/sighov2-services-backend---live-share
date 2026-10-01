import { Paciente } from '../entities/paciente.entity';

export abstract class PacienteRepositoryPort {
  // Los métodos que ya tienes:
  abstract buscarPacientes(termino?: string, limite?: number): Promise<any[]>;
  abstract buscarPorId(idPersona: number): Promise<any | null>;

  // Nuevo método homologado con Laravel:
  abstract listarPacientesAdministracion(limite?: number): Promise<any[]>;
}