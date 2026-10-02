export interface MedicamentoParametro {
    idMedicamento: number;
    idViaParenteral?: number;
    idReceta?: number;
    idRecetaManual?: number;
    cantidad?: number;
    observacion?: string;
}

export interface ParametrosRegistroInyeccion {
    idPersona: number;
    idEspecialista?: number | null;
    idViaParenteral?: number | null;
    idReceta?: number | null;
    idRecetaManual?: number | null;
    idUsuario?: number | null;
    medicamentos?: MedicamentoParametro[];
    procedimientos?: any;
}

export abstract class RegistroInyeccionRepositoryPort {
    abstract crearTransaccionCompleta(datos: ParametrosRegistroInyeccion): Promise<any>;
    abstract buscarPorPaciente(idPersona: number): Promise<any[]>;
    abstract buscarPorId(id: number): Promise<any | null>;

    // Nuevos métodos para el listado y visualización:
    abstract listarRegistros(buscar?: string, limite?: number): Promise<any[]>;
    abstract obtenerDetalleCompleto(idRegistro: number): Promise<any | null>;
    abstract cambiarEstado(idRegistro: number, estado: boolean, idUsuario?: number): Promise<boolean>;
    abstract actualizarTransaccion(idRegistro: number, datos: any, idUsuario?: number): Promise<boolean>;
}