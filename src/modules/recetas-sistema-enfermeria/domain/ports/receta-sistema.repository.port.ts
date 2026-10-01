import { RecetaSistema } from '../entities/receta-sistema.entity';

export abstract class RecetaSistemaRepositoryPort {
    abstract buscarPorNumero(numeroReceta: string): Promise<RecetaSistema | null>;
    abstract buscarPorId(idReceta: number): Promise<RecetaSistema | null>;
}