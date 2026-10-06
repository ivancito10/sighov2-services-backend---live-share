export class RegistroFisioterapeutaError extends Error {
    constructor(
        public readonly tipo:
            'validacion' | 'conflicto' | 'configuracion' | 'no_encontrado',
        message: string,
    ) {
        super(message);
        this.name = 'RegistroFisioterapeutaError';
    }
}
