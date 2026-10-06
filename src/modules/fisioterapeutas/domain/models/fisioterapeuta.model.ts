export interface CrearFisioterapeuta {
    ci: string;
    complemento?: string | null;
    nombres: string;
    primerApellido?: string | null;
    segundoApellido?: string | null;
    sexo: 'M' | 'F';
    esExtranjero: boolean;
    fechaNacimiento: string;
    idEstadoCivil: number;
    idDeptExp: number;
    tipoContrato: 'EVENTUAL' | 'PERMANENTE';
    fechaContratoInicio?: string | null;
    fechaContratoFin?: string | null;
    gradoAcademico: 'DOCTOR' | 'LICENCIADO';
}
export interface RegistroFisioterapeuta {
    ci: string;
    complemento: string | null;
    nombres: string;
    primerApellido: string | null;
    segundoApellido: string | null;
    sexo: 'M' | 'F';
    esExtranjero: boolean;
    fechaNacimiento: string;
    idEstadoCivil: number;
    idDeptExp: number;
    idNacimientoMunicipio: number;
    matricula: string;
    claveUnica: string;
    permanente: boolean;
    fechaContratoInicio: string | null;
    fechaContratoFin: string | null;
    gradoAcademico: 'DOCTOR' | 'LICENCIADO';
    nombreUsuario: string;
    email: string;
    passwordHash: string;
    idUsuarioCreador: number;
}
export interface FisioterapeutaCreado {
    esExtranjero: boolean;
    idPersona: number;
    idEspecialista: number;
    idUsuario: string;
    nombreCompleto: string;
    email: string;
    matricula: string;
    foto: string;
    imagen: string;
}
export interface CatalogosFisioterapeuta {
    estadosCiviles: { id: number; nombre: string }[];
    expedidos: { id: number; nombre: string; sigla: string }[];
}
