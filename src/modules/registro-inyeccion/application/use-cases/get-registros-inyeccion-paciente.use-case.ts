import { Injectable } from '@nestjs/common';
import { RegistroInyeccionRepositoryPort } from '../../domain/ports/registro-inyeccion.repository.port';

@Injectable()
export class GetRegistrosInyeccionPacienteUseCase {
    constructor(private readonly repo: RegistroInyeccionRepositoryPort) { }

    async ejecutar(idPersona: number) {
        return await this.repo.buscarPorPaciente(idPersona);
    }
}