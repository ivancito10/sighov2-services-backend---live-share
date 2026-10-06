export interface SedeBase {
    id: number;
    ubicacion: string | null;
    piso: string | null;
    id_residencia: number | null;
    residencia: string | null;
}
export interface FiltroSede {
    pagina: number;
    limite: number;
    buscar: string;
}
export abstract class SedePort {
    abstract listar(
        filtro: FiltroSede,
    ): Promise<{ datos: SedeBase[]; total: number }>;
    abstract obtener(id: string): Promise<SedeBase | null>;
}

export class SedeError extends Error {
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
        throw new SedeError(400, 'ID o parámetro de paginación inválido');
    return value;
}
