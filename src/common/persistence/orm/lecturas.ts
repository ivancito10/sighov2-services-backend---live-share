import { Brackets, ILike } from 'typeorm';
import type { DataSource, WhereExpressionBuilder } from 'typeorm';
import { EspecialistaOrm, PersonaOrm } from './entities';
import type { PersonaRow, EspecialistaRow, CatalogoRow } from './entities';
export const patron = (s: string) => '%' + s.replace(/[\\%_]/g, '\\$&') + '%';
export const nombreCompleto = (p: PersonaRow) =>
    [p.nombres, p.primerApellido, p.segundoApellido]
        .filter(Boolean)
        .join(' ')
        .trim();
export function buscarPersona<T extends WhereExpressionBuilder>(
    qb: T,
    buscar: string,
    relacion = false,
): T {
    if (!buscar.trim()) return qb;
    const condicion = (value: object) =>
        relacion ? { persona: value } : value;
    const like = ILike(patron(buscar));
    qb.andWhere(
        new Brackets((q) => {
            q.where(condicion({ ci: like })).orWhere(
                condicion({ matricula: like }),
            );
            // Cada palabra puede pertenecer a nombres o a cualquiera de los apellidos.
            q.orWhere(
                new Brackets((n) => {
                    for (const palabra of buscar.trim().split(/\s+/)) {
                        const valor = ILike(patron(palabra));
                        n.andWhere(
                            new Brackets((p) =>
                                p
                                    .where(condicion({ nombres: valor }))
                                    .orWhere(
                                        condicion({ primerApellido: valor }),
                                    )
                                    .orWhere(
                                        condicion({ segundoApellido: valor }),
                                    ),
                            ),
                        );
                    }
                }),
            );
        }),
    );
    return qb;
}
export function personasQuery(db: DataSource) {
    return db
        .getRepository(PersonaOrm)
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.expedido', 'd')
        .leftJoinAndSelect('p.estadoCivil', 'ec')
        .leftJoinAndSelect('p.municipio', 'm')
        .leftJoinAndSelect('p.tipoAsegurado', 'ta')
        .leftJoin('p.creador', 'uc')
        .addSelect(['uc.id', 'uc.name'])
        .leftJoin('p.actualizador', 'uu')
        .addSelect(['uu.id', 'uu.name']);
}
export function especialistasQuery(db: DataSource) {
    return db
        .getRepository(EspecialistaOrm)
        .createQueryBuilder('e')
        .innerJoinAndSelect('e.persona', 'p')
        .leftJoinAndSelect('p.expedido', 'd')
        .leftJoinAndSelect('e.especialidad', 'esp');
}
const catalogo = (id: number | null, row?: CatalogoRow | null) => ({
    id,
    nombre: row?.nombre ?? null,
});
export function mapPersona(p: PersonaRow) {
    return {
        id: p.id,
        idPersona: p.id,
        ci: p.ci,
        complemento: p.complemento,
        nombres: p.nombres,
        p_apellido: p.primerApellido,
        s_apellido: p.segundoApellido,
        matricula_seguro: p.matricula,
        fecha_nacimiento: p.fechaNacimiento,
        primerApellido: p.primerApellido,
        segundoApellido: p.segundoApellido,
        nombreCompleto: nombreCompleto(p),
        matricula: p.matricula,
        fechaNacimiento: p.fechaNacimiento,
        sexo: p.sexo,
        esExtranjero: p.esExtranjero,
        tipoDocumento:
            p.esExtranjero === true
                ? 'EXTRANJERO'
                : p.esExtranjero === false
                  ? 'NACIONAL'
                  : null,
        idEstadoCivil: p.idEstadoCivil,
        idDeptExp: p.idDeptExp,
        idNacimientoMunicipio: p.idNacimientoMunicipio,
        idTipoAsegurado: p.idTipoAsegurado,
        afiliado: p.afiliado,
        estadoAsuss: p.estadoAsuss,
        expedido: {
            ...catalogo(p.idDeptExp, p.expedido),
            sigla: p.expedido?.sigla ?? null,
        },
        estadoCivil: catalogo(p.idEstadoCivil, p.estadoCivil),
        municipioNacimiento: catalogo(p.idNacimientoMunicipio, p.municipio),
        tipoAsegurado: catalogo(p.idTipoAsegurado, p.tipoAsegurado),
        usuarioCreador: {
            id: p.idUsuarioCreador,
            nombre: p.creador?.name ?? null,
        },
        usuarioActualizador: {
            id: p.idUsuarioActualizador,
            nombre: p.actualizador?.name ?? null,
        },
    };
}
export function mapEspecialista(e: EspecialistaRow) {
    const p = e.persona!;
    return {
        idEspecialista: e.id,
        idPersona: p.id,
        ci: p.ci,
        complemento: p.complemento,
        matricula: p.matricula,
        nombreCompleto: nombreCompleto(p),
        tipoContrato:
            e.permanente === true
                ? ('PERMANENTE' as const)
                : e.permanente === false
                  ? ('EVENTUAL' as const)
                  : null,
        contratoDesde: e.permanente ? null : e.fechaContratoInicio,
        contratoHasta: e.permanente ? null : e.fechaContratoFin,
        estado: e.estado,
        nombres: p.nombres,
        primerApellido: p.primerApellido,
        segundoApellido: p.segundoApellido,
        fechaNacimiento: p.fechaNacimiento,
        sexo: p.sexo,
        foto: e.foto,
        gradoAcademico: e.gradoAcademico,
        expedido: {
            ...catalogo(p.idDeptExp, p.expedido),
            sigla: p.expedido?.sigla ?? null,
        },
        especialidad: catalogo(e.idEspecialidad, e.especialidad),
        esExtranjero: p.esExtranjero,
        tipoDocumento:
            p.esExtranjero === true
                ? ('EXTRANJERO' as const)
                : p.esExtranjero === false
                  ? ('NACIONAL' as const)
                  : null,
    };
}
