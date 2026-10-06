import type { RegistroFisioterapeuta } from '../models/fisioterapeuta.model';
export interface SeleccionIncorporacion {
    idPersona: number;
    idEspecialista?: number;
    idUsuario?: string;
}
export interface IncorporacionResultado {
    idPersona: number;
    idEspecialista: number;
    idUsuario: string;
    especialistaCreado: boolean;
    usuarioCreado: boolean;
    email: string | null;
    matricula: string;
}
export abstract class IncorporarFisioterapeutaPort {
    abstract incorporar(
        seleccion: SeleccionIncorporacion,
        datos: RegistroFisioterapeuta,
    ): Promise<IncorporacionResultado>;
}