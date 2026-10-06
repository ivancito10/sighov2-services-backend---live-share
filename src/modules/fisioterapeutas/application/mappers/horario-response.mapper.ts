import type {
    HorarioSemanalFisioterapeuta,
    SedeFisioterapia,
} from '../../domain/models/consulta-fisioterapeuta.model';

// Contrato público: los IDs de relación permanecen dentro del repositorio/caso de uso.
export function horarioResponse(
    h: HorarioSemanalFisioterapeuta,
    sede?: SedeFisioterapia,
) {
    return {
        idHorario: h.idHorario,
        idEspecialista: h.idEspecialista,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
        intervalo: h.intervalo,
        vigenteDesde: h.vigenteDesde,
        vigenteHasta: h.vigenteHasta,
        cuposNormales: h.cuposNormales,
        cuposEspeciales: h.cuposEspeciales,
        // alcance: 'SEMANAL' as const,
        sede: sede ?? { id: h.idSede, piso: null, ubicacion: null },
    };
}
