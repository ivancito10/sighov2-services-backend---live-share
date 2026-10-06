export interface ConsultaFisioterapeutas {
    buscar: string;
    pagina: number;
    limite: number;
}
export interface FisioterapeutaListado {
    idEspecialista: number; // plataforma.especialista
    idPersona: number;
    ci: string;
    complemento: string | null;
    matricula: string | null;
    nombreCompleto: string;
    tipoContrato: 'PERMANENTE' | 'EVENTUAL' | null;
    contratoDesde: string | null;
    contratoHasta: string | null;
    estado: boolean | null;
    nombres: string;
    primerApellido: string | null;
    segundoApellido: string | null;
    fechaNacimiento: string | null;
    sexo: string | null;
    foto: string | null;
    gradoAcademico: string | null;
    expedido: {
        id: number | null;
        sigla: string | null;
        nombre: string | null;
    };
    especialidad: { id: number; nombre: string };
    esExtranjero: boolean | null;
    tipoDocumento: 'NACIONAL' | 'EXTRANJERO' | null;
}
export type FisioterapeutaDatos = FisioterapeutaListado;
export interface HorarioSemanalFisioterapeuta {
    idHorario: string;
    idEspecialista: number;
    idAsignacionSede: string;
    idSede: number;
    idPoliticaAgenda: string;
    horaInicio: string | null;
    horaFin: string | null;
    intervalo: number | null;
    vigenteDesde: string | null;
    vigenteHasta: string | null;
    cuposNormales: number | null;
    cuposEspeciales: number | null;
}
export interface SedeFisioterapia {
    id: number;
    piso: string | null;
    ubicacion: string | null;
}
export interface PaginaFisioterapeutas {
    datos: FisioterapeutaListado[];
    total: number;
}
