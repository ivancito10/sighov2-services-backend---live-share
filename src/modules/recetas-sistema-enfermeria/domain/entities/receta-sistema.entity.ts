import { RecetaSistemaMedicamento } from './receta-sistema-medicamento.entity';

export class RecetaSistema {
    constructor(
        public readonly idReceta: number,
        public readonly numeroReceta: string,
        public readonly fechaEmision: Date,
        public readonly idPersona: number,
        public readonly pacienteNombre: string,
        public readonly pacienteCi: string,
        public readonly pacienteMatricula: string,
        public readonly idEspecialista: number | null,
        public readonly medicoNombre: string,
        public readonly especialidad: string,
        public readonly medicamentos: RecetaSistemaMedicamento[],
    ) { }
}