export class RegistroInyeccionProcedimiento {
    constructor(
        public readonly id: number,
        public readonly idRegistroInyeccion: number,
        public readonly curacionPlana: boolean,
        public readonly curacionInfectada: boolean,
        public readonly oxigenoterapia: boolean,
        public readonly retiroPuntos: boolean,
        public readonly pruebaSensibilidad: boolean,
        public readonly sangria: boolean,
        public readonly signosVitales: boolean,
        public readonly txVo: boolean,
        public readonly orientacionSalud: boolean,
        public readonly vendajes: boolean,
        public readonly nebulizacion: boolean,
        public readonly otros: string | null,
        public readonly observaciones: string | null,
        public readonly estado: boolean,
    ) { }
}