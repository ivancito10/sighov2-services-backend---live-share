import { Injectable, NotFoundException } from '@nestjs/common';
import { EspecialistaRepositoryPort } from '../../domain/ports/especialista.repository.port';

@Injectable()
export class GetEspecialistaByIdUseCase {
    constructor(private readonly repo: EspecialistaRepositoryPort) { }

    async ejecutar(idEspecialista: number) {
        const especialista = await this.repo.buscarPorId(idEspecialista);
        if (!especialista) {
            throw new NotFoundException(`Especialista con ID ${idEspecialista} no encontrado`);
        }
        return especialista;
    }
}