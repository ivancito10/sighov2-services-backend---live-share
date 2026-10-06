import { Equal, ILike, IsNull, Not, Or } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import {
    PersonaOrm,
    UsuarioOrm,
    EspecialistaOrm,
    EstadoCivilOrm,
    DepartamentoOrm,
    EspecialidadOrm,
    MunicipioOrm,
    TipoAseguradoOrm,
} from '../../../../common/persistence/orm/entities';
import { RegistroFisioterapeutaError as ErrorRegistro } from '../../domain/errors/registro-fisioterapeuta.error';
import type { RegistroFisioterapeuta } from '../../domain/models/fisioterapeuta.model';
import { patron } from '../../../../common/persistence/orm/lecturas';

// SERIALIZABLE protege las comprobaciones de ausencia y evita duplicados entre
// operaciones concurrentes de estos adaptadores sin recurrir a SQL/advisory locks.
export async function transaccionFisio<T>(
    db: DataSource,
    fn: (m: EntityManager) => Promise<T>,
): Promise<T> {
    for (let intento = 0; ; intento++) {
        try {
            return await db.transaction('SERIALIZABLE', fn);
        } catch (error) {
            if (error instanceof ErrorRegistro) throw error;
            const e = error as {
                code?: string;
                driverError?: { code?: string };
            };
            const code = e.driverError?.code ?? e.code;
            if (['40001', '40P01'].includes(code ?? '') && intento < 2)
                continue;
            if (['23505', '40001', '40P01'].includes(code ?? ''))
                throw new ErrorRegistro(
                    'conflicto',
                    'Datos duplicados o modificación concurrente; vuelva a consultar',
                );
            if (['23503', '23514'].includes(code ?? ''))
                throw new ErrorRegistro(
                    'validacion',
                    'Datos incompatibles con las restricciones de la base',
                );
            // Nunca propagar QueryFailedError: sus parámetros pueden contener hashes.
            throw new Error(
                'No se pudo guardar el fisioterapeuta; la transacción fue revertida',
            );
        }
    }
}
export type DatosPersonales = Pick<
    RegistroFisioterapeuta,
    | 'ci'
    | 'complemento'
    | 'nombres'
    | 'primerApellido'
    | 'segundoApellido'
    | 'sexo'
    | 'esExtranjero'
    | 'fechaNacimiento'
    | 'idEstadoCivil'
    | 'idDeptExp'
    | 'matricula'
    | 'claveUnica'
>;
export function personaDatos(d: DatosPersonales) {
    return {
        ci: d.ci,
        complemento: d.complemento,
        nombres: d.nombres,
        primerApellido: d.primerApellido,
        segundoApellido: d.segundoApellido,
        sexo: d.sexo,
        esExtranjero: d.esExtranjero,
        fechaNacimiento: d.fechaNacimiento,
        idEstadoCivil: d.idEstadoCivil,
        idDeptExp: d.idDeptExp,
        matricula: d.matricula,
        claveUnica: d.claveUnica,
    };
}
export async function documentoLibre(
    m: EntityManager,
    d: Pick<DatosPersonales, 'ci' | 'complemento' | 'claveUnica'>,
    excluir?: number,
) {
    const id = excluir === undefined ? {} : { id: Not(excluir) };
    const dup = await m.getRepository(PersonaOrm).exists({
        where: [
            { ...id, claveUnica: d.claveUnica },
            {
                ...id,
                ci: d.ci,
                complemento: d.complemento ?? Or(IsNull(), Equal('')),
            },
        ],
    });
    if (dup)
        throw new ErrorRegistro(
            'conflicto',
            'Otra persona tiene el mismo documento; utilice incorporación si ya existe',
        );
}
export async function referencias(
    m: EntityManager,
    d: Pick<RegistroFisioterapeuta, 'idEstadoCivil' | 'idDeptExp'>,
    actor?: number,
) {
    const [civil, expedido] = await Promise.all([
        m.getRepository(EstadoCivilOrm).existsBy({ id: d.idEstadoCivil }),
        m.getRepository(DepartamentoOrm).existsBy({ id: d.idDeptExp }),
    ]);
    if (!civil || !expedido)
        throw new ErrorRegistro(
            'validacion',
            'Estado civil o expedido inexistente',
        );
    if (actor !== undefined) {
        if (
            !(await m
                .getRepository(UsuarioOrm)
                .existsBy({ id: String(actor), estado: true }))
        )
            throw new ErrorRegistro(
                'validacion',
                'El usuario creador no existe o está inactivo',
            );
        if (!(await m.getRepository(EspecialidadOrm).existsBy({ id: 89 })))
            throw new ErrorRegistro(
                'configuracion',
                'No existe la especialidad 89',
            );
    }
}
export function especialistaDatos(
    d: Pick<
        RegistroFisioterapeuta,
        | 'permanente'
        | 'fechaContratoInicio'
        | 'fechaContratoFin'
        | 'gradoAcademico'
    >,
) {
    return {
        idEspecialidad: 89,
        permanente: d.permanente,
        fechaContratoInicio: d.fechaContratoInicio,
        fechaContratoFin: d.fechaContratoFin,
        gradoAcademico: d.gradoAcademico,
        estado: true,
        afiliados: true,
        estudiantes: true,
        convenios: true,
        externo: false,
        especialistaImagenologia: false,
    };
}
export async function crearEspecialista(
    m: EntityManager,
    idPersona: number,
    d: RegistroFisioterapeuta,
) {
    const repo = m.getRepository(EspecialistaOrm);
    const e = await repo.save(
        repo.create({
            ...especialistaDatos(d),
            idPersona,
            idUsuarioCreador: d.idUsuarioCreador,
        }),
    );
    const foto = e.id + '.jpg';
    await repo.update({ id: e.id }, { foto });
    return { id: e.id, foto };
}
export async function crearPersona(
    m: EntityManager,
    d: RegistroFisioterapeuta,
) {
    if (
        !(await m
            .getRepository(MunicipioOrm)
            .existsBy({ id: d.idNacimientoMunicipio })) ||
        !(await m.getRepository(TipoAseguradoOrm).existsBy({ id: 1 }))
    )
        throw new ErrorRegistro(
            'configuracion',
            'Municipio o tipo de asegurado inexistente',
        );
    const repo = m.getRepository(PersonaOrm);
    return repo.save(
        repo.create({
            ...personaDatos(d),
            idNacimientoMunicipio: d.idNacimientoMunicipio,
            idTipoAsegurado: 1,
            idUsuarioCreador: d.idUsuarioCreador,
        }),
    );
}
export async function crearUsuario(
    m: EntityManager,
    idPersona: number,
    d: RegistroFisioterapeuta,
) {
    const repo = m.getRepository(UsuarioOrm);
    const [local, domain] = d.email.split('@');
    let email = d.email;
    for (let n = 0; ; n++) {
        // Escape comodines para comparar el email exacto sin distinguir mayúsculas.
        if (
            !(await repo.existsBy({ email: ILike(patron(email).slice(1, -1)) }))
        )
            break;
        if (n >= 9999)
            throw new ErrorRegistro(
                'conflicto',
                'No se pudo asignar un correo disponible',
            );
        const sufijo = String(n + 1);
        email = local.slice(0, 64 - sufijo.length) + sufijo + '@' + domain;
    }
    const u = await repo.save(
        repo.create({
            name: d.nombreUsuario,
            email,
            password: d.passwordHash,
            estado: true,
            idPersona,
            idUsuarioCreador: String(d.idUsuarioCreador),
        }),
    );
    const imagen = u.id + '-U.png';
    await repo.update({ id: u.id }, { imagen });
    return { id: u.id, email, imagen };
}