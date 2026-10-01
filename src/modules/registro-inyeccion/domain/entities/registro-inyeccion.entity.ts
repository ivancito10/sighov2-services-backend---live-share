export class RegistroInyeccion {
    constructor(
        public readonly id: number,
        public readonly idPersona: number,
        public readonly idEspecialista: number | null,
        public readonly idViaParenteral: number | null,
        public readonly idReceta: number | null,
        public readonly idRecetaManual: number | null,
        public readonly estado: boolean,
        public readonly idUserCreated?: number | null,
        public readonly idUserUpdated?: number | null,
        public readonly createdAt?: Date | null,
        public readonly updatedAt?: Date | null,
    ) { }
}