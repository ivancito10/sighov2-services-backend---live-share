import { Medicamento } from '../entities/medicamento.entity';

export abstract class MedicamentoRepositoryPort {
    abstract buscarMedicamentos(termino?: string, limite?: number): Promise<Medicamento[]>;
    abstract buscarPorId(idMedicamento: number): Promise<Medicamento | null>;
}