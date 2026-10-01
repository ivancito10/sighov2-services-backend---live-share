export class RecetaManual {
    constructor(
        public readonly id: number,
        public readonly idPersona: number,
        public readonly idEspecialista: number | null,
        public readonly idMedicamento: number,
        public readonly fechaReceta: string,
        public readonly estado: boolean,
        public readonly idUserCreated?: number | null,
        public readonly idUserUpdated?: number | null,
        public readonly createdAt?: Date | null,
        public readonly updatedAt?: Date | null,
    ) { }
}