export type Recurso = 'asignaciones' | 'horarios';
export class HorarioError extends Error {
    constructor(
        public readonly status: 400 | 404 | 409,
        message: string,
    ) {
        super(message);
    }
}
export interface Vigencia {
    vigenteDesde: string | null;
    vigenteHasta: string | null;
}
export interface Asignacion extends Vigencia {
    id: string;
    idEspecialista: number;
    idSede: number;
    estado: boolean | null;
}
export interface Horario extends Vigencia {
    id: string;
    idEspecialista: number;
    idAsignacionSede: string;
    idPoliticaAgenda: string;
    horaInicio: string;
    horaFin: string;
    intervalo: number;
    estado: boolean | null;
}
export type Registro = Asignacion | Horario;
export type Cambios = Record<string, string | number | boolean | null>;
export interface Filtros {
    pagina: number;
    limite: number;
    buscar: string;
    estado?: boolean;
    vigencia?: 'actual' | 'vencida' | 'futura';
}
export interface Pagina {
    datos: unknown[];
    total: number;
}
export abstract class HorariosPort {
    abstract especialista(
        id: number,
    ): Promise<{ id: number; estado: boolean | null } | null>;
    abstract listar(
        recurso: Recurso,
        especialista: number,
        filtros: Filtros,
    ): Promise<Pagina>;
    abstract obtener(recurso: Recurso, id: string): Promise<Registro | null>;
    abstract guardar(
        recurso: Recurso,
        id: string | null,
        especialista: number | null,
        actor: number,
        resolver: (actual: Registro | null) => Cambios,
    ): Promise<Registro>;
    abstract sedes(filtros: Filtros): Promise<Pagina>;
    abstract personas(filtros: Filtros): Promise<Pagina>;
}
export function idValido(value: unknown, max = 9223372036854775807n): string {
    if (
        (typeof value !== 'string' && typeof value !== 'number') ||
        !/^[1-9]\d{0,18}$/.test(String(value)) ||
        (typeof value === 'number' && !Number.isSafeInteger(value)) ||
        BigInt(value) > max
    )
        throw new HorarioError(400, 'ID inválido');
    return String(value);
}
export function objeto(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new HorarioError(400, 'Se requiere un objeto JSON');
    return value as Record<string, unknown>;
}
export function campos(value: Record<string, unknown>, nombres: string[]) {
    if (
        !Object.keys(value).length ||
        Object.keys(value).some((k) => !nombres.includes(k))
    )
        throw new HorarioError(400, 'Campos vacíos o no permitidos');
}
export function fechas(d: Record<string, unknown>): Vigencia {
    const out: Vigencia = { vigenteDesde: null, vigenteHasta: null };
    for (const k of ['vigenteDesde', 'vigenteHasta'] as const) {
        const v = d[k] ?? null;
        if (v !== null) {
            if (
                typeof v !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
                v.startsWith('0000-')
            )
                throw new HorarioError(400, 'Vigencia inválida');
            const date = new Date(v + 'T00:00:00Z');
            if (
                Number.isNaN(date.getTime()) ||
                date.toISOString().slice(0, 10) !== v
            )
                throw new HorarioError(400, 'Fecha inexistente');
        }
        out[k] = v as string | null;
    }
    if (
        out.vigenteDesde &&
        out.vigenteHasta &&
        out.vigenteDesde > out.vigenteHasta
    )
        throw new HorarioError(400, 'Vigencia final anterior al inicio');
    return out;
}
export function contenida(hijo: Vigencia, padre: Vigencia) {
    if (
        (padre.vigenteDesde &&
            (!hijo.vigenteDesde || hijo.vigenteDesde < padre.vigenteDesde)) ||
        (padre.vigenteHasta &&
            (!hijo.vigenteHasta || hijo.vigenteHasta > padre.vigenteHasta))
    )
        throw new HorarioError(
            409,
            'La vigencia del horario debe estar dentro de la asignación y de la política',
        );
}
export function validarDatos(
    recurso: Recurso,
    d: Record<string, unknown>,
): Cambios {
    const vigencia = fechas(d);
    if (recurso === 'asignaciones')
        return { idSede: Number(idValido(d.idSede, 2147483647n)), ...vigencia };
    const hora = (v: unknown) => {
        if (
            typeof v !== 'string' ||
            !/^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(v)
        )
            throw new HorarioError(400, 'Hora inválida; use HH:mm o HH:mm:00');
        return v.slice(0, 5) + ':00';
    };
    const horaInicio = hora(d.horaInicio),
        horaFin = hora(d.horaFin);
    const minutos = (s: string) =>
        Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
    const duracion = minutos(horaFin) - minutos(horaInicio);
    if (duracion <= 0)
        throw new HorarioError(
            400,
            'La hora final debe ser posterior al inicio dentro del mismo día',
        );
    if (
        typeof d.intervalo !== 'number' ||
        !Number.isInteger(d.intervalo) ||
        d.intervalo < 1 ||
        d.intervalo > duracion ||
        duracion % d.intervalo !== 0
    )
        throw new HorarioError(
            400,
            'El intervalo en minutos debe dividir exactamente el bloque horario',
        );
    // Las FK del DDL son INTEGER aunque las PK de las tablas son BIGINT.
    return {
        idAsignacionSede: idValido(d.idAsignacionSede, 2147483647n),
        idPoliticaAgenda: idValido(d.idPoliticaAgenda, 2147483647n),
        horaInicio,
        horaFin,
        intervalo: d.intervalo,
        ...vigencia,
    };
}
export function filtros(
    input: unknown,
    extras: ('estado' | 'vigencia')[] = [],
): Filtros {
    const q = objeto(input);
    if (
        Object.keys(q).some(
            (k) => !['pagina', 'limite', 'buscar', ...extras].includes(k),
        )
    )
        throw new HorarioError(400, 'Filtro no permitido');
    const entero = (v: unknown, fallback: number, max: number) =>
        v === undefined ? fallback : Number(idValido(v, BigInt(max)));
    if (
        q.buscar !== undefined &&
        (typeof q.buscar !== 'string' || q.buscar.length > 100)
    )
        throw new HorarioError(400, 'Búsqueda inválida');
    if (
        q.estado !== undefined &&
        !['true', 'false'].includes(q.estado as string)
    )
        throw new HorarioError(400, 'Estado inválido');
    if (
        q.vigencia !== undefined &&
        !['actual', 'vencida', 'futura'].includes(q.vigencia as string)
    )
        throw new HorarioError(400, 'Vigencia inválida');
    return {
        pagina: entero(q.pagina, 1, 1000000),
        limite: entero(q.limite, 20, 100),
        buscar: ((q.buscar as string) ?? '').trim(),
        estado: q.estado === undefined ? undefined : q.estado === 'true',
        vigencia: q.vigencia as Filtros['vigencia'],
    };
}
