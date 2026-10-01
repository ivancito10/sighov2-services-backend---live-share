import { Injectable, NotFoundException } from '@nestjs/common';
import { ViaParenteralRepositoryPort } from '../../domain/ports/via-parenteral.repository.port';

@Injectable()
export class ToggleViaParenteralUseCase {
  constructor(private readonly repo: ViaParenteralRepositoryPort) {}

  async ejecutar(id: number, nuevoEstado: boolean, idUsuario?: number): Promise<boolean> {
    const via = await this.repo.buscarPorId(id);
    if (!via) {
      throw new NotFoundException(`La vía parenteral con ID ${id} no existe`);
    }

    return await this.repo.cambiarEstado(id, nuevoEstado, idUsuario);
  }
}