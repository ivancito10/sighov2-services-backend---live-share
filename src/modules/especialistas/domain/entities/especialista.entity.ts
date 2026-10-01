export class Especialista {
    constructor(
        public readonly idEspecialista: number,
        public readonly idPersona: number,
        public readonly nombreCompleto: string,
        public readonly especialidad: string,
        public readonly matriculaColegio?: string | null,
        public readonly estado?: boolean,
    ) { }
}