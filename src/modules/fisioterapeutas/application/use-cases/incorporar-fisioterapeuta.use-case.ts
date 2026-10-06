import { CrearFisioterapeutaUseCase } from './crear-fisioterapeuta.use-case';
import { IncorporarFisioterapeutaPort } from '../../domain/ports/incorporar-fisioterapeuta.port';
import type { SeleccionIncorporacion } from '../../domain/ports/incorporar-fisioterapeuta.port';
import type { CrearFisioterapeuta } from '../../domain/models/fisioterapeuta.model';
export class IncorporarFisioterapeutaUseCase {
    constructor(
        private readonly repo: IncorporarFisioterapeutaPort,
        private readonly creador: CrearFisioterapeutaUseCase,
    ) {}
    async ejecutar(
        input: CrearFisioterapeuta & SeleccionIncorporacion,
        actor: number,
    ) {
        const { datos, passwordTemporal } = await this.creador.preparar(
            input,
            actor,
        );
        const resultado = await this.repo.incorporar(input, datos);
        return resultado.usuarioCreado
            ? { ...resultado, passwordTemporal }
            : resultado;
    }
}