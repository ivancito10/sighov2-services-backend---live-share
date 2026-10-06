import { FisioterapeutasRepositoryPort } from '../../domain/ports/fisioterapeutas.repository.port';
export class ObtenerCatalogosFisioterapeutasUseCase {
    constructor(private readonly repository: FisioterapeutasRepositoryPort) {}
    ejecutar() {
        return this.repository.catalogos();
    }
}
