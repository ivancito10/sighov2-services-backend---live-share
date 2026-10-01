export class RegistroInyeccionMedicamento {
    constructor(
        public readonly id: number,
        public readonly idRegistroInyeccion: number,
        public readonly idMedicamento: number,
        public readonly observacion: string | null,
        public readonly estado: boolean,
    ) { }
}