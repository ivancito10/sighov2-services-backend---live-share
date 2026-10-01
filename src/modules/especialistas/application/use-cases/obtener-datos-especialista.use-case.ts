import { Injectable } from '@nestjs/common';
import { EspecialistaRepositoryPort } from '../../domain/ports/especialista.repository.port';

@Injectable()
export class ObtenerDatosEspecialistaUseCase {
  constructor(private readonly repo: EspecialistaRepositoryPort) {}

  async execute(idEspecialista: number): Promise<any | null> {
    return await this.repo.obtenerDatosEspecialista(idEspecialista);
  }
}
