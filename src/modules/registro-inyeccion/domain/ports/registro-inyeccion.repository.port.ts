export interface ParametrosRegistroInyeccion {
    idPersona: number;
    idEspecialista?: number | null;
    idViaParenteral?: number | null;
    idReceta?: number | null;
    idRecetaManual?: number | null;
    idUsuario?: number | null;
    medicamentos?: Array<{
        idMedicamento: number;
        observacion?: string;
    }>;
    procedimientos?: {
        curacionPlana?: boolean;
        curacionInfectada?: boolean;
        oxigenoterapia?: boolean;
        retiroPuntos?: boolean;
        pruebaSensibilidad?: boolean;
        sangria?: boolean;
        signosVitales?: boolean;
        txVo?: boolean;
        orientacionSalud?: boolean;
        vendajes?: boolean;
        nebulizacion?: boolean;
        otros?: string;
        observaciones?: string;
    };
}

export abstract class RegistroInyeccionRepositoryPort {
    abstract crearTransaccionCompleta(datos: ParametrosRegistroInyeccion): Promise<{
        idRegistroInyeccion: number;
        totalMedicamentos: number;
        procedimientosRegistrados: boolean;
    }>;
    abstract buscarPorPaciente(idPersona: number): Promise<any[]>;
    abstract buscarPorId(id: number): Promise<any | null>;
}