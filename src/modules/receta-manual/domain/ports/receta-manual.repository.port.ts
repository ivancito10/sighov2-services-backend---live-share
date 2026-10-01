import { RecetaManual } from '../entities/receta-manual.entity';

export abstract class RecetaManualRepositoryPort {
    abstract crear(data: {
        idPersona: number;
        idEspecialista?: number | null;
        idMedicamento: number;
        fechaReceta: string;
        idUserCreated?: number | null;
    }): Promise<RecetaManual>;
    abstract buscarPorPaciente(idPersona: number): Promise<RecetaManual[]>;
    abstract buscarPorId(id: number): Promise<RecetaManual | null>;
}