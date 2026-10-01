export class Medicamento {
    constructor(
        public readonly idMedicamento: number,
        public readonly codigo: string,
        public readonly nombre: string,
        public readonly concentracion?: string | null,
        public readonly formaFarmaceutica?: string | null,
        public readonly presentacion?: string | null,
        public readonly estado?: boolean,
    ) { }
}