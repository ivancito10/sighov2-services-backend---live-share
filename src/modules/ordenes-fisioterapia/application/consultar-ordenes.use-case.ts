import { OrdenesPort, OrdenError, validarId } from '../domain/orden';

export class ConsultarOrdenesUseCase {
    constructor(private readonly repo: OrdenesPort) {}
    async listar(q: Record<string, unknown>) {
        if (Object.keys(q).some((k) => !['pagina', 'limite'].includes(k)))
            throw new OrdenError(400, 'Filtro no permitido');
        const pagina = Number(validarId(q.pagina ?? '1', 1000000n));
        const limite = Number(validarId(q.limite ?? '20', 100n));
        const { datos, total } = await this.repo.listar({ pagina, limite });
        return {
            datos,
            paginacion: {
                pagina,
                limite,
                total,
                totalPaginas: Math.ceil(total / limite),
            },
        };
    }
    async obtener(id: string) {
        const orden = await this.repo.obtener(validarId(id));
        if (!orden)
            throw new OrdenError(404, 'Orden de fisioterapia no encontrada');
        return orden;
    }
}
