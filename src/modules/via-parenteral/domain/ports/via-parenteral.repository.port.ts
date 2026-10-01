import { ViaParenteral } from '../entities/via-parenteral.entity';

export abstract class ViaParenteralRepositoryPort {
  abstract listarActivos(): Promise<ViaParenteral[]>;
  abstract listarTodos(): Promise<ViaParenteral[]>;
  abstract buscarPorId(id: number): Promise<ViaParenteral | null>;
  abstract buscarPorCodigo(codigo: string): Promise<ViaParenteral | null>;
  abstract crear(data: {
    codigo: string;
    nombre: string;
    idUserCreated?: number;
  }): Promise<ViaParenteral>;
  abstract actualizar(
    id: number,
    data: { codigo?: string; nombre?: string; idUserUpdated?: number },
  ): Promise<ViaParenteral | null>;
  abstract cambiarEstado(id: number, estado: boolean, idUserUpdated?: number): Promise<boolean>;
}