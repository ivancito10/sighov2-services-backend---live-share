import { ConsultaFisioterapeutasPort } from '../../domain/ports/consulta-fisioterapeutas.port';
import { ObtenerFisioterapeutaUseCase } from './obtener-fisioterapeuta.use-case';
import { horarioResponse } from '../mappers/horario-response.mapper';
export class ObtenerHorariosFisioterapeutaUseCase {
    constructor(private readonly repository: ConsultaFisioterapeutasPort) {}
    async ejecutar(id: string) {
        const { fisioterapeuta } = await new ObtenerFisioterapeutaUseCase(
            this.repository,
        ).ejecutar(id);
        const horarios = await this.repository.horarios(id);
        const idsSedes = [...new Set(horarios.map((h) => h.idSede))];
        const sedes = new Map(
            (idsSedes.length ? await this.repository.sedes(idsSedes) : []).map(
                (s) => [s.id, s],
            ),
        );
        return {
            idEspecialista: fisioterapeuta.idEspecialista,
            horariosSemanales: horarios.map((h) =>
                horarioResponse(h, sedes.get(h.idSede)),
            ),
        };
    }
}
