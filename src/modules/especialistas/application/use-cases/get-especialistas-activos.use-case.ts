import { paginationMeta } from '../../../../common/application/pagination-meta';
import { Injectable } from '@nestjs/common';
import { EspecialistaRepositoryPort } from '../../domain/ports/especialista.repository.port';
import type { ConsultaEspecialistas } from '../../domain/ports/especialista.repository.port';

@Injectable()
export class GetEspecialistasActivosUseCase {
    constructor(private readonly repo: EspecialistaRepositoryPort) {}

    async ejecutar(consulta: ConsultaEspecialistas) {
        const { datos, total } = await this.repo.listarActivos(consulta);
        return {
            datos,
            meta: paginationMeta(total, consulta.pagina, consulta.limite),
        };
    }
}
