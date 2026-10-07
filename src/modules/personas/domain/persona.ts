export interface PersonaBase {
    id: number;
    nombres: string;
    primerApellido: string | null;
    segundoApellido: string | null;
    nombreCompleto: string;
    ci: string;
    complemento: string | null;
    matricula: string | null;
    fechaNacimiento: string | null;
    sexo: string | null;
    esExtranjero: boolean | null;
    tipoDocumento: string | null;
    expedido: {
        id: number | null;
        nombre: string | null;
        sigla: string | null;
    };
    estadoCivil: { id: number | null; nombre: string | null };
    municipioNacimiento: { id: number | null; nombre: string | null };
    tipoAsegurado: { id: number | null; nombre: string | null };
    usuarioCreador: { id: number | null; nombre: string | null };
    usuarioActualizador: { id: number | null; nombre: string | null };
}
export interface FiltroPersona {
    pagina: number;
    limite: number;
    buscar: string;
    ci?: string;
    complemento?: string;
    matricula?: string;
    nombre?: string;
}
export abstract class PersonaPort {
    abstract listar(
        filtro: FiltroPersona,
    ): Promise<{ datos: PersonaBase[]; total: number }>;
    abstract obtener(id: string): Promise<PersonaBase | null>;
}

export class PersonaError extends Error {
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
        throw new PersonaError(400, 'ID o parámetro de paginación inválido');
    return value;
}