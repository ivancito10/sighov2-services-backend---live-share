import { Injectable, NotFoundException } from '@nestjs/common';
import { MedicamentoRepositoryPort } from '../../domain/ports/medicamento.repository.port';

@Injectable()
export class GetMedicamentoByIdUseCase {
    constructor(private readonly repo: MedicamentoRepositoryPort) { }

    async ejecutar(idMedicamento: number) {
        const med = await this.repo.buscarPorId(idMedicamento);
        if (!med) {
            throw new NotFoundException(`Medicamento con ID ${idMedicamento} no encontrado`);
        }
        return med;
    }
}