import { Injectable } from '@nestjs/common';
import { ViaParenteralRepositoryPort } from '../../domain/ports/via-parenteral.repository.port';

@Injectable()
export class GetViasParenteralesUseCase {
  constructor(private readonly repo: ViaParenteralRepositoryPort) {}

  async ejecutar(soloActivos: boolean = true) {
    if (soloActivos) {
      return await this.repo.listarActivos();
    }
    return await this.repo.listarTodos();
  }
}