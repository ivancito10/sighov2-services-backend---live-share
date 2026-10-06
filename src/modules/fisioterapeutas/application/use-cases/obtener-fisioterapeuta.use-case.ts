import { ConsultaFisioterapeutasPort } from '../../domain/ports/consulta-fisioterapeutas.port';
import { RegistroFisioterapeutaError } from '../../domain/errors/registro-fisioterapeuta.error';
export class ObtenerFisioterapeutaUseCase {
    constructor(private readonly repository: ConsultaFisioterapeutasPort) {}
    async ejecutar(id: string) {
        if (!/^[1-9]\d{0,9}$/.test(id) || BigInt(id) > 2147483647n)
            throw new RegistroFisioterapeutaError(
                'validacion',
                'ID de fisioterapeuta inválido',
            );
        const fisioterapeuta = await this.repository.buscar(id);
        if (!fisioterapeuta)
            throw new RegistroFisioterapeutaError(
                'no_encontrado',
                'Fisioterapeuta no encontrado',
            );
        return { fisioterapeuta };
    }
}
