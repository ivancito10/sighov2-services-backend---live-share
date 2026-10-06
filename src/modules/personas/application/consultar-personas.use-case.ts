import { PersonaPort, PersonaError, validarId } from '../domain/persona';

export class ConsultarPersonasUseCase {
    constructor(private readonly repo: PersonaPort) {}
    async listar(q: Record<string, unknown>) {
        if (
            Object.keys(q).some(
                (k) => !['pagina', 'limite', 'buscar'].includes(k),
            )
        )
            throw new PersonaError(400, 'Filtro no permitido');
        const pagina = Number(validarId(q.pagina ?? '1', 1000000n));
        const limite = Number(validarId(q.limite ?? '20', 100n));
        if (
            q.buscar !== undefined &&
            (typeof q.buscar !== 'string' || q.buscar.length > 100)
        )
            throw new PersonaError(400, 'Búsqueda inválida');
        const buscar = ((q.buscar as string) ?? '').trim();
        const { datos, total } = await this.repo.listar({
            pagina,
            limite,
            buscar,
        });
        return {
            datos,
            total,
            paginacion: {
                pagina,
                limite,
                total,
                totalPaginas: Math.ceil(total / limite),
            },
        };
    }
    async obtener(id: string) {
        const persona = await this.repo.obtener(validarId(id, 2147483647n));
        if (!persona) throw new PersonaError(404, 'Persona no encontrada');
        return persona;
    }
}
