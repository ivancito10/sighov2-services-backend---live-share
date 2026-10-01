import { Injectable } from '@nestjs/common';
import { MedicamentoRepositoryPort } from '../../domain/ports/medicamento.repository.port';

@Injectable()
export class SearchMedicamentosUseCase {
    constructor(private readonly repo: MedicamentoRepositoryPort) { }

    async ejecutar(termino?: string) {
        return await this.repo.buscarMedicamentos(termino?.trim());
    }
}