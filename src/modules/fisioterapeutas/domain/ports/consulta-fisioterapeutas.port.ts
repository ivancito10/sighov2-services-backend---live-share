import type {
    ConsultaFisioterapeutas,
    PaginaFisioterapeutas,
    FisioterapeutaDatos,
    HorarioSemanalFisioterapeuta,
    SedeFisioterapia,
} from '../models/consulta-fisioterapeuta.model';
export abstract class ConsultaFisioterapeutasPort {
    abstract listar(
        consulta: ConsultaFisioterapeutas,
    ): Promise<PaginaFisioterapeutas>;
    abstract buscar(
        idEspecialista: string,
    ): Promise<FisioterapeutaDatos | null>;
    abstract horarios(
        idEspecialista: string,
    ): Promise<HorarioSemanalFisioterapeuta[]>;
    abstract sedes(ids: number[]): Promise<SedeFisioterapia[]>;
}
