import type { CrearFisioterapeuta } from '../models/fisioterapeuta.model';
export interface CambiosFisioterapeuta extends CrearFisioterapeuta {
    matricula: string;
    claveUnica: string;
    nombreUsuario: string;
}
export abstract class EditarFisioterapeutaPort {
    abstract editar(
        id: number,
        actor: number,
        preparar: (actual: CrearFisioterapeuta) => CambiosFisioterapeuta,
    ): Promise<{
        idEspecialista: number;
        idPersona: number;
        matricula: string;
    }>;
    abstract estado(
        id: number,
        actor: number,
        estado: boolean,
    ): Promise<{ idEspecialista: number; estado: boolean }>;
}
