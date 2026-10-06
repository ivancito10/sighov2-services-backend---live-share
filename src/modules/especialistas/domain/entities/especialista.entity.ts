export interface Especialista {
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
    especialidad: { id: number | null; nombre: string | null };
    esExtranjero: boolean | null;
    tipoDocumento: 'NACIONAL' | 'EXTRANJERO' | null;
}
