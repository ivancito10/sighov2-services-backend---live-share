import { Injectable, NotFoundException } from '@nestjs/common';
import { RecetaSistemaRepositoryPort } from '../../domain/ports/receta-sistema.repository.port';

@Injectable()
export class GetRecetaSistemaByNumeroUseCase {
    constructor(private readonly repo: RecetaSistemaRepositoryPort) { }

    async ejecutar(numeroReceta: string) {
        const receta = await this.repo.buscarPorNumero(numeroReceta.trim());
        if (!receta) {
            throw new NotFoundException(`No se encontró ninguna receta institucional con el número ${numeroReceta}`);
        }
        return receta;
    }
}