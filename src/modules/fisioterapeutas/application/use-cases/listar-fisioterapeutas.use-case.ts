import { paginationMeta } from '../../../../common/application/pagination-meta';
import { ConsultaFisioterapeutasPort } from '../../domain/ports/consulta-fisioterapeutas.port';
import type { ConsultaFisioterapeutas } from '../../domain/models/consulta-fisioterapeuta.model';
export class ListarFisioterapeutasUseCase {
    constructor(private readonly repository: ConsultaFisioterapeutasPort) {}
    async ejecutar(consulta: ConsultaFisioterapeutas) {
        const { datos, total } = await this.repository.listar(consulta);
        return {
            datos,
            meta: paginationMeta(total, consulta.pagina, consulta.limite),
        };
    }
}
