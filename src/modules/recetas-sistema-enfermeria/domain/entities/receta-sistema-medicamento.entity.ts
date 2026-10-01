export class RecetaSistemaMedicamento {
    constructor(
        public readonly idDetalle: number,
        public readonly idMedicamento: number,
        public readonly codigoMedicamento: string,
        public readonly nombreMedicamento: string,
        public readonly cantidad: number,
        public readonly indicaciones?: string | null,
        public readonly viaAdministracionSugerida?: string | null,
    ) { }
}