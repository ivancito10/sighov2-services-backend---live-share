export interface PersonaOrden {
    id: number;
    nombres: string;
    p_apellido: string | null;
    s_apellido: string | null;
    ci: string;
    complemento: string | null;
    matricula_seguro: string | null;
    sexo: string | null;
    fecha_nacimiento: string | null;
    es_extranjero: boolean | null;
}
export interface EmisorOrden {
    id_user: string;
    id_persona: number | null;
    persona: PersonaOrden | null;
    especialistas: {
        id: number;
        grado_academico: string | null;
        estado: boolean | null;
        especialidad: { id: number; nombre: string | null } | null;
    }[];
}
export interface OrdenBase {
    id: string;
    nro_solicitud: number;
    nro_sesion: number;
    indicaciones: string;
    id_persona: number | null;
    id_user_created: string | null;
}
export interface Orden extends OrdenBase {
    paciente: PersonaOrden | null;
    emisor: EmisorOrden | null;
}
export interface FiltroOrdenes {
    pagina: number;
    limite: number;
}
export abstract class OrdenesPort {
    abstract listar(
        filtro: FiltroOrdenes,
    ): Promise<{ datos: Orden[]; total: number }>;
    abstract obtener(id: string): Promise<Orden | null>;
}
export class OrdenError extends Error {
    constructor(
        public readonly status: 400 | 404,
        message: string,
    ) {
        super(message);
    }
}
export function validarId(value: unknown, max = 9223372036854775807n): string {
    if (
        typeof value !== 'string' ||
        !/^[1-9]\d{0,18}$/.test(value) ||
        BigInt(value) > max
    )
        throw new OrdenError(400, 'ID o parámetro de paginación inválido');
    return value;
}
