import { Injectable } from '@nestjs/common';
import { EspecialistaRepositoryPort } from '../../domain/ports/especialista.repository.port';

@Injectable()
export class GetEspecialistasActivosUseCase {
    constructor(private readonly repo: EspecialistaRepositoryPort) { }

    async ejecutar(termino?: string) {
        return await this.repo.listarActivos(termino?.trim());
    }
}