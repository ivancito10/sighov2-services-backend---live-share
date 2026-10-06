import {
    HorariosPort,
    HorarioError,
    idValido,
    objeto,
    campos,
    validarDatos,
    filtros,
} from '../domain/horarios';
import type { Recurso, Filtros, Pagina } from '../domain/horarios';
const keys = {
    asignaciones: ['idSede', 'vigenteDesde', 'vigenteHasta'],
    horarios: [
        'idAsignacionSede',
        'idPoliticaAgenda',
        'horaInicio',
        'horaFin',
        'intervalo',
        'vigenteDesde',
        'vigenteHasta',
    ],
};
export class GestionarHorariosUseCase {
    constructor(private readonly repo: HorariosPort) {}
    private async especialista(id: string, activo = false) {
        const numero = Number(idValido(id, 2147483647n));
        const e = await this.repo.especialista(numero);
        if (!e)
            throw new HorarioError(
                404,
                'El ID no existe o no corresponde a un fisioterapeuta',
            );
        if (activo && e.estado !== true)
            throw new HorarioError(409, 'El fisioterapeuta está inactivo');
        return numero;
    }
    private pagina(p: Pagina, f: Filtros) {
        return {
            ...p,
            paginacion: {
                pagina: f.pagina,
                limite: f.limite,
                total: p.total,
                totalPaginas: Math.ceil(p.total / f.limite),
            },
        };
    }
    async listar(recurso: Recurso, id: string, q: unknown) {
        const f = filtros(q, ['estado', 'vigencia']);
        const especialista = await this.especialista(id);
        return this.pagina(await this.repo.listar(recurso, especialista, f), f);
    }
    async obtener(recurso: Recurso, id: string) {
        idValido(id);
        const row = await this.repo.obtener(recurso, id);
        if (!row) throw new HorarioError(404, 'Registro no encontrado');
        await this.especialista(String(row.idEspecialista));
        return row;
    }
    async crear(recurso: Recurso, id: string, body: unknown, actor: number) {
        const b = objeto(body);
        campos(b, keys[recurso]);
        const datos = validarDatos(recurso, b);
        const especialista = await this.especialista(id, true);
        return this.repo.guardar(
            recurso,
            null,
            especialista,
            actor,
            () => datos,
        );
    }
    async editar(recurso: Recurso, id: string, body: unknown, actor: number) {
        idValido(id);
        const b = objeto(body);
        campos(b, keys[recurso]);
        return this.repo.guardar(recurso, id, null, actor, (actual) =>
            validarDatos(recurso, { ...actual, ...b }),
        );
    }
    async estado(recurso: Recurso, id: string, body: unknown, actor: number) {
        idValido(id);
        const b = objeto(body);
        campos(b, ['estado']);
        if (typeof b.estado !== 'boolean')
            throw new HorarioError(400, 'estado debe ser booleano');
        const estado = b.estado;
        return this.repo.guardar(recurso, id, null, actor, () => ({ estado }));
    }
    async sedes(q: unknown) {
        const f = filtros(q);
        return this.pagina(await this.repo.sedes(f), f);
    }
    async personas(q: unknown) {
        const f = filtros(q);
        return this.pagina(await this.repo.personas(f), f);
    }
}
