import { Injectable } from '@nestjs/common';
import { EspecialistaRepositoryPort } from '../../domain/ports/especialista.repository.port';

@Injectable()
export class ListarEspecialistasHabilitadosUseCase {
  constructor(private readonly repo: EspecialistaRepositoryPort) { }

  //async execute(): Promise<any[]> {
  //return await this.repo.listarHabilitados();
  //}
}
