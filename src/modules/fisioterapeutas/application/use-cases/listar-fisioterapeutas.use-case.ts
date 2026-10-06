import { ConsultaFisioterapeutasPort } from '../../domain/ports/consulta-fisioterapeutas.port';
import type { ConsultaFisioterapeutas } from '../../domain/models/consulta-fisioterapeuta.model';
export class ListarFisioterapeutasUseCase {
    constructor(private readonly repository: ConsultaFisioterapeutasPort) {}
    async ejecutar(consulta: ConsultaFisioterapeutas) {
        const { datos, total } = await this.repository.listar(consulta);
        return {
            datos,
            paginacion: {
                pagina: consulta.pagina,
                limite: consulta.limite,
                total,
                totalPaginas: Math.ceil(total / consulta.limite),
            },
        };
    }
}
