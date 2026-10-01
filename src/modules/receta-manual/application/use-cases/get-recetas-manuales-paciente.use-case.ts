import { Injectable } from '@nestjs/common';
import { RecetaManualRepositoryPort } from '../../domain/ports/receta-manual.repository.port';

@Injectable()
export class GetRecetasManualesPacienteUseCase {
    constructor(private readonly repo: RecetaManualRepositoryPort) { }

    async ejecutar(idPersona: number) {
        return await this.repo.buscarPorPaciente(idPersona);
    }
}