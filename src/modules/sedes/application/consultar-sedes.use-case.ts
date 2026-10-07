import { paginationMeta } from '../../../common/application/pagination-meta';
import { SedePort, SedeError, validarId } from '../domain/sede';

export class ConsultarSedesUseCase {
    constructor(private readonly repo: SedePort) {}
    async listar(q: Record<string, unknown>) {
        if (
            Object.keys(q).some(
                (k) => !['pagina', 'limite', 'buscar'].includes(k),
            )
        )
            throw new SedeError(400, 'Filtro no permitido');
        const pagina = Number(validarId(q.pagina ?? '1', 1000000n));
        const limite = Number(validarId(q.limite ?? '20', 100n));
        if (
            q.buscar !== undefined &&
            (typeof q.buscar !== 'string' || q.buscar.length > 100)
        )
            throw new SedeError(400, 'Búsqueda inválida');
        const buscar = ((q.buscar as string) ?? '').trim();
        const { datos, total } = await this.repo.listar({
            pagina,
            limite,
            buscar,
        });
        return {
            datos,
            total,
            meta: paginationMeta(total, pagina, limite),
        };
    }
    async obtener(id: string) {
        const sede = await this.repo.obtener(validarId(id, 2147483647n));
        if (!sede) throw new SedeError(404, 'Sede no encontrada');
        return sede;
    }
}