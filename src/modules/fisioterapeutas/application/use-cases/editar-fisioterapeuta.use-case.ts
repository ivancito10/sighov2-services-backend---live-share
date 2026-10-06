import { EditarFisioterapeutaPort } from '../../domain/ports/editar-fisioterapeuta.port';
import type { CrearFisioterapeuta } from '../../domain/models/fisioterapeuta.model';
import { RegistroFisioterapeutaError } from '../../domain/errors/registro-fisioterapeuta.error';
import {
    texto,
    fechaValida,
    generarMatricula,
} from '../../domain/services/datos-fisioterapeuta';
export class EditarFisioterapeutaUseCase {
    constructor(private readonly repo: EditarFisioterapeutaPort) {}
    private id(raw: string) {
        if (!/^[1-9]\d{0,9}$/.test(raw) || Number(raw) > 2147483647)
            throw new RegistroFisioterapeutaError('validacion', 'ID inv�lido');
        return Number(raw);
    }
    editar(raw: string, cambios: Partial<CrearFisioterapeuta>, actor: number) {
        const id = this.id(raw);
        cambios = Object.fromEntries(
            Object.entries(cambios).filter(([, value]) => value !== undefined),
        );
        if (!Object.keys(cambios).length)
            throw new RegistroFisioterapeutaError(
                'validacion',
                'Debe enviar al menos un campo',
            );
        return this.repo.editar(id, actor, (actual) => {
            const input = { ...actual, ...cambios };
            const invalid = (message: string): never => {
                throw new RegistroFisioterapeutaError('validacion', message);
            };
            const nombres = texto(input.nombres);
            const primerApellido = texto(input.primerApellido ?? '') || null;
            const segundoApellido = texto(input.segundoApellido ?? '') || null;
            const ci = texto(input.ci);
            const complemento =
                texto(input.complemento ?? '').toUpperCase() || null;
            if (!ci || !nombres || (!primerApellido && !segundoApellido))
                invalid('CI, nombres y al menos un apellido son obligatorios');
            if (typeof input.esExtranjero !== 'boolean')
                invalid('esExtranjero debe ser true o false');
            if (!['M', 'F'].includes(input.sexo)) invalid('Sexo inválido');
            if (!['DOCTOR', 'LICENCIADO'].includes(input.gradoAcademico))
                invalid('Grado académico inválido');
            if (!['EVENTUAL', 'PERMANENTE'].includes(input.tipoContrato))
                invalid('Tipo de contrato inválido');
            if (
                !fechaValida(input.fechaNacimiento) ||
                input.fechaNacimiento > new Date().toISOString().slice(0, 10)
            )
                invalid('Fecha de nacimiento inválida');
            if (
                ![input.idEstadoCivil, input.idDeptExp].every(
                    (id) => Number.isInteger(id) && id > 0,
                )
            )
                invalid('Catálogos inválidos');
            const permanente = input.tipoContrato === 'PERMANENTE';
            if (
                !permanente &&
                (!input.fechaContratoInicio ||
                    !input.fechaContratoFin ||
                    !fechaValida(input.fechaContratoInicio) ||
                    !fechaValida(input.fechaContratoFin) ||
                    input.fechaContratoInicio > input.fechaContratoFin)
            )
                invalid(
                    'Contrato eventual: fechas válidas obligatorias y fin no anterior al inicio',
                );

            return {
                ...input,
                nombres,
                primerApellido,
                segundoApellido,
                ci,
                complemento,
                fechaContratoInicio: permanente
                    ? null
                    : input.fechaContratoInicio,
                fechaContratoFin: permanente ? null : input.fechaContratoFin,
                matricula: generarMatricula(
                    input.fechaNacimiento,
                    input.sexo,
                    nombres,
                    primerApellido,
                    segundoApellido,
                ),
                claveUnica: ci + (complemento ?? ''),
                nombreUsuario: [nombres, primerApellido, segundoApellido]
                    .filter(Boolean)
                    .join(' '),
            };
        });
    }
    estado(raw: string, estado: boolean, actor: number) {
        const id = this.id(raw);
        if (typeof estado !== 'boolean')
            throw new RegistroFisioterapeutaError(
                'validacion',
                'estado debe ser booleano',
            );
        return this.repo.estado(id, actor, estado);
    }
}
