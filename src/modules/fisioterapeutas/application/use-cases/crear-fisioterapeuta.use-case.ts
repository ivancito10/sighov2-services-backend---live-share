import type {
    CrearFisioterapeuta,
    RegistroFisioterapeuta,
} from '../../domain/models/fisioterapeuta.model';
import { FisioterapeutasRepositoryPort } from '../../domain/ports/fisioterapeutas.repository.port';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RegistroFisioterapeutaError } from '../../domain/errors/registro-fisioterapeuta.error';
import {
    texto,
    fechaValida,
    generarMatricula,
    generarEmail,
} from '../../domain/services/datos-fisioterapeuta';
export interface ConfiguracionFisioterapeutas {
    emailDomain?: string;
    idNacimientoMunicipio: number;
}
export class CrearFisioterapeutaUseCase {
    constructor(
        private readonly repository: FisioterapeutasRepositoryPort,
        private readonly hasher: PasswordHasherPort,
        private readonly config: ConfiguracionFisioterapeutas,
    ) {}
    async ejecutar(input: CrearFisioterapeuta, idUsuarioCreador: number) {
        const { datos, passwordTemporal } = await this.preparar(
            input,
            idUsuarioCreador,
        );
        const creado = await this.repository.crear(datos);
        return { ...creado, passwordTemporal };
    }
    async preparar(input: CrearFisioterapeuta, idUsuarioCreador: number) {
        const invalid = (message: string): never => {
            throw new RegistroFisioterapeutaError('validacion', message);
        };
        if (
            !Number.isInteger(idUsuarioCreador) ||
            idUsuarioCreador < 1 ||
            idUsuarioCreador > 2147483647
        )
            invalid('Usuario creador inválido');
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
        const domain = this.config.emailDomain?.trim();
        if (
            !domain ||
            !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)
        )
            throw new RegistroFisioterapeutaError(
                'configuracion',
                'Configurar FISIOTERAPEUTAS_EMAIL_DOMAIN antes de registrar usuarios',
            );
        if (
            !Number.isInteger(this.config.idNacimientoMunicipio) ||
            this.config.idNacimientoMunicipio < 1
        )
            throw new RegistroFisioterapeutaError(
                'configuracion',
                'Municipio de nacimiento predeterminado inválido',
            );
        const credencial = await this.hasher.generarTemporal();
        const datos: RegistroFisioterapeuta = {
            ci,
            complemento,
            nombres,
            primerApellido,
            segundoApellido,
            sexo: input.sexo,
            esExtranjero: input.esExtranjero,
            fechaNacimiento: input.fechaNacimiento,
            idEstadoCivil: input.idEstadoCivil,
            idDeptExp: input.idDeptExp,
            idNacimientoMunicipio: this.config.idNacimientoMunicipio,
            matricula: generarMatricula(
                input.fechaNacimiento,
                input.sexo,
                nombres,
                primerApellido,
                segundoApellido,
            ),
            claveUnica: ci + (complemento ?? ''),
            permanente,
            fechaContratoInicio: permanente ? null : input.fechaContratoInicio!,
            fechaContratoFin: permanente ? null : input.fechaContratoFin!,
            gradoAcademico: input.gradoAcademico,
            nombreUsuario: [nombres, primerApellido, segundoApellido]
                .filter(Boolean)
                .join(' '),
            email: generarEmail(
                nombres,
                primerApellido,
                segundoApellido,
                domain,
            ),
            passwordHash: credencial.passwordHash,
            idUsuarioCreador,
        };
        return { datos, passwordTemporal: credencial.passwordTemporal };
    }
}