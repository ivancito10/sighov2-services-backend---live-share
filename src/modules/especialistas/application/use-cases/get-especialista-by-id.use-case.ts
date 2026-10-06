import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { EspecialistaRepositoryPort } from '../../domain/ports/especialista.repository.port';

@Injectable()
export class GetEspecialistaByIdUseCase {
    constructor(private readonly repo: EspecialistaRepositoryPort) {}

    async ejecutar(idEspecialista: number) {
        if (
            !Number.isInteger(idEspecialista) ||
            idEspecialista < 1 ||
            idEspecialista > 2147483647
        )
            throw new BadRequestException('ID de especialista inválido');
        const especialista = await this.repo.buscarPorId(idEspecialista);
        if (!especialista) {
            throw new NotFoundException(
                `Especialista con ID ${idEspecialista} no encontrado`,
            );
        }
        return { especialista };
    }
}
