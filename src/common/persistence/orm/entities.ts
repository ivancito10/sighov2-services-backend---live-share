import { EntitySchema } from 'typeorm';
import type { EntitySchemaColumnOptions } from 'typeorm';

export interface CatalogoRow {
    id: number;
    nombre: string;
    sigla?: string | null;
}
export interface PersonaRow {
    id: number;
    ci: string;
    complemento: string | null;
    nombres: string;
    primerApellido: string | null;
    segundoApellido: string | null;
    sexo: string | null;
    fechaNacimiento: string | null;
    matricula: string | null;
    esExtranjero: boolean | null;
    idEstadoCivil: number | null;
    idDeptExp: number | null;
    idNacimientoMunicipio: number | null;
    idTipoAsegurado: number;
    afiliado: boolean;
    estadoAsuss: boolean | null;
    claveUnica: string;
    idUsuarioCreador: number | null;
    idUsuarioActualizador: number | null;
    createdAt: Date;
    updatedAt: Date;
    expedido?: CatalogoRow | null;
    estadoCivil?: CatalogoRow | null;
    municipio?: CatalogoRow | null;
    tipoAsegurado?: CatalogoRow | null;
    creador?: UsuarioRow | null;
    actualizador?: UsuarioRow | null;
}
export interface UsuarioRow {
    id: string;
    name: string;
    email: string;
    password: string;
    estado: boolean | null;
    idPersona: number | null;
    imagen: string | null;
    lastLoginAt: Date | null;
    idUsuarioCreador: string | null;
    idUsuarioActualizador: string | null;
    createdAt: Date;
    updatedAt: Date;
    persona?: PersonaRow | null;
}
export interface EspecialistaRow {
    id: number;
    idPersona: number;
    idEspecialidad: number | null;
    estado: boolean | null;
    permanente: boolean | null;
    fechaContratoInicio: string | null;
    fechaContratoFin: string | null;
    gradoAcademico: string | null;
    foto: string | null;
    afiliados: boolean;
    estudiantes: boolean;
    convenios: boolean;
    externo: boolean;
    especialistaImagenologia: boolean;
    idUsuarioCreador: number | null;
    idUsuarioActualizador: number | null;
    createdAt: Date;
    updatedAt: Date;
    persona?: PersonaRow | null;
    especialidad?: CatalogoRow | null;
}
export interface ResidenciaRow {
    id: number;
    direccion: string;
}
export interface SedeRow {
    id: number;
    piso: string | null;
    ubicacion: string | null;
    idResidencia: number | null;
    residencia?: ResidenciaRow | null;
}
const id: EntitySchemaColumnOptions = {
    type: 'integer',
    primary: true,
    generated: 'increment',
};
const col = (
    name: string,
    type: EntitySchemaColumnOptions['type'] = 'varchar',
    nullable = true,
): EntitySchemaColumnOptions => ({ name, type, nullable });
const auditoria = {
    idUsuarioCreador: col('id_user_created', 'integer'),
    idUsuarioActualizador: col('id_user_updated', 'integer'),
    createdAt: { ...col('created_at', 'timestamp'), createDate: true },
    updatedAt: { ...col('updated_at', 'timestamp'), updateDate: true },
};
const referencia = (target: string, name: string) => ({
    type: 'many-to-one' as const,
    target,
    joinColumn: { name },
    nullable: true,
    createForeignKeyConstraints: false,
});
function catalogo(
    name: string,
    tableName: string,
    nombre = 'nombre',
    sigla = false,
) {
    return new EntitySchema<CatalogoRow>({
        name,
        schema: 'administracion',
        tableName,
        columns: {
            id,
            nombre: col(nombre, 'varchar', false),
            ...(sigla ? { sigla: col('sigla') } : {}),
        },
    });
}
export const DepartamentoOrm = catalogo(
    'OrmDepartamento',
    'departamento',
    'nombre',
    true,
);
export const EstadoCivilOrm = catalogo('OrmEstadoCivil', 'estado_civil');
export const MunicipioOrm = catalogo('OrmMunicipio', 'municipio');
export const TipoAseguradoOrm = catalogo(
    'OrmTipoAsegurado',
    'tipo_asegurado',
    'tipo_asegurado',
);
export const EspecialidadOrm = catalogo(
    'OrmEspecialidad',
    'especialidad',
    'especialidad',
    true,
);
export const PersonaOrm = new EntitySchema<PersonaRow>({
    name: 'OrmPersona',
    schema: 'administracion',
    tableName: 'persona',
    columns: {
        id,
        ci: col('ci', 'varchar', false),
        complemento: col('complemento'),
        nombres: col('nombres', 'varchar', false),
        primerApellido: col('p_apellido'),
        segundoApellido: col('s_apellido'),
        sexo: col('sexo', 'char'),
        fechaNacimiento: col('fecha_nacimiento', 'date'),
        matricula: col('matricula_seguro'),
        esExtranjero: col('es_extranjero', 'boolean'),
        idEstadoCivil: col('id_estado_civil', 'integer'),
        idDeptExp: col('id_dept_exp', 'integer'),
        idNacimientoMunicipio: col('id_nacimiento_municipio', 'integer'),
        idTipoAsegurado: col('id_tipo_asegurado', 'integer', false),
        afiliado: { ...col('afiliado', 'boolean', false), default: false },
        estadoAsuss: col('estado_asuss', 'boolean'),
        claveUnica: col('clave_unica', 'varchar', false),
        ...auditoria,
    },
    relations: {
        expedido: referencia('OrmDepartamento', 'id_dept_exp'),
        estadoCivil: referencia('OrmEstadoCivil', 'id_estado_civil'),
        municipio: referencia('OrmMunicipio', 'id_nacimiento_municipio'),
        tipoAsegurado: referencia('OrmTipoAsegurado', 'id_tipo_asegurado'),
        creador: referencia('OrmUsuario', 'id_user_created'),
        actualizador: referencia('OrmUsuario', 'id_user_updated'),
    },
});
export const UsuarioOrm = new EntitySchema<UsuarioRow>({
    name: 'OrmUsuario',
    schema: 'administracion',
    tableName: 'users',
    columns: {
        id: { type: 'bigint', primary: true, generated: 'increment' },
        name: col('name', 'varchar', false),
        email: col('email', 'varchar', false),
        password: { ...col('password', 'varchar', false), select: false },
        estado: col('estado', 'boolean'),
        idPersona: col('id_persona', 'integer'),
        imagen: col('imagen'),
        lastLoginAt: col('last_login_at', 'timestamp'),
        ...auditoria,
        idUsuarioCreador: col('id_user_created', 'bigint'),
        idUsuarioActualizador: col('id_user_updated', 'bigint'),
    },
    relations: { persona: referencia('OrmPersona', 'id_persona') },
});
export const EspecialistaOrm = new EntitySchema<EspecialistaRow>({
    name: 'OrmEspecialista',
    schema: 'plataforma',
    tableName: 'especialista',
    columns: {
        id,
        idPersona: col('id_persona', 'integer', false),
        idEspecialidad: col('id_especialidad', 'integer'),
        estado: col('estado', 'boolean'),
        permanente: col('permanente', 'boolean'),
        fechaContratoInicio: col('fecha_contrato_inicio', 'date'),
        fechaContratoFin: col('fecha_contrato_fin', 'date'),
        gradoAcademico: col('grado_academico'),
        foto: col('foto'),
        afiliados: col('afiliados', 'boolean'),
        estudiantes: col('estudiantes', 'boolean'),
        convenios: col('convenios', 'boolean'),
        externo: col('externo', 'boolean'),
        especialistaImagenologia: col('especialista_imagenologia', 'boolean'),
        ...auditoria,
    },
    relations: {
        persona: referencia('OrmPersona', 'id_persona'),
        especialidad: referencia('OrmEspecialidad', 'id_especialidad'),
    },
});
export const ResidenciaOrm = new EntitySchema<ResidenciaRow>({
    name: 'OrmResidencia',
    schema: 'administracion',
    tableName: 'residencia',
    columns: { id, direccion: col('direccion', 'varchar', false) },
});
export const SedeOrm = new EntitySchema<SedeRow>({
    name: 'OrmSede',
    schema: 'plataforma',
    tableName: 'sedes',
    columns: {
        id: { type: 'integer', primary: true },
        piso: col('piso'),
        ubicacion: col('ubicacion'),
        idResidencia: col('id_residencia', 'integer'),
    },
    relations: { residencia: referencia('OrmResidencia', 'id_residencia') },
});
export interface RolRow {
    id: string;
    name: string;
    guardName: string;
    habilitado: boolean;
}
export interface ModeloRolRow {
    roleId: string;
    modelId: string;
    modelType: string;
    rol?: RolRow;
}
export const RolOrm = new EntitySchema<RolRow>({
    name: 'OrmRol',
    schema: 'administracion',
    tableName: 'roles',
    columns: {
        id: { type: 'bigint', primary: true },
        name: col('name'),
        guardName: col('guard_name'),
        habilitado: col('role_enabled', 'boolean'),
    },
});
export const ModeloRolOrm = new EntitySchema<ModeloRolRow>({
    name: 'OrmModeloRol',
    schema: 'administracion',
    tableName: 'model_has_roles',
    columns: {
        roleId: { ...col('role_id', 'bigint', false), primary: true },
        modelId: { ...col('model_id', 'bigint', false), primary: true },
        modelType: { ...col('model_type', 'varchar', false), primary: true },
    },
    relations: { rol: referencia('OrmRol', 'role_id') },
});
export const entidadesEtapa1 = [
    PersonaOrm,
    UsuarioOrm,
    EspecialistaOrm,
    DepartamentoOrm,
    EstadoCivilOrm,
    MunicipioOrm,
    TipoAseguradoOrm,
    EspecialidadOrm,
    ResidenciaOrm,
    SedeOrm,
    RolOrm,
    ModeloRolOrm,
];

export interface VigenciaRow {
    vigenteDesde: string | null;
    vigenteHasta: string | null;
    estado: boolean | null;
}
export interface AsignacionRow extends VigenciaRow {
    id: string;
    idEspecialista: number;
    idSede: number;
}
export interface PoliticaRow extends VigenciaRow {
    id: string;
    cuposNormales: number | null;
    cuposEspeciales: number | null;
}
export interface HorarioRow extends VigenciaRow {
    id: string;
    idAsignacionSede: number;
    idPoliticaAgenda: number;
    horaInicio: string | null;
    horaFin: string | null;
    intervalo: number | null;
    asignacion: AsignacionRow;
    politica: PoliticaRow;
}
const vigencia = {
    vigenteDesde: col('vigente_desde', 'date'),
    vigenteHasta: col('vigente_hasta', 'date'),
    estado: col('estado', 'boolean'),
};
const idGrande: EntitySchemaColumnOptions = {
    type: 'bigint',
    primary: true,
    generated: 'increment',
};
export const AsignacionOrm = new EntitySchema<AsignacionRow>({
    name: 'OrmAsignacion',
    schema: 'fisioterapia',
    tableName: 'asignaciones_sede',
    columns: {
        id: idGrande,
        idEspecialista: col('id_especialista', 'integer', false),
        idSede: col('id_sede', 'integer', false),
        ...vigencia,
    },
});
export const PoliticaOrm = new EntitySchema<PoliticaRow>({
    name: 'OrmPolitica',
    schema: 'fisioterapia',
    tableName: 'politicas_agenda',
    columns: {
        id: idGrande,
        cuposNormales: col('cupos_normales', 'integer'),
        cuposEspeciales: col('cupos_especiales', 'integer'),
        ...vigencia,
    },
});
export const HorarioOrm = new EntitySchema<HorarioRow>({
    name: 'OrmHorario',
    schema: 'fisioterapia',
    tableName: 'horarios_semanales',
    columns: {
        id: idGrande,
        idAsignacionSede: col('id_asignacion_sede', 'integer', false),
        idPoliticaAgenda: col('id_politica_agenda', 'integer', false),
        horaInicio: col('hora_inicio', 'time'),
        horaFin: col('hora_fin', 'time'),
        intervalo: col('intervalo', 'integer'),
        ...vigencia,
    },
    relations: {
        asignacion: referencia('OrmAsignacion', 'id_asignacion_sede'),
        politica: referencia('OrmPolitica', 'id_politica_agenda'),
    },
});
export const entidadesEtapa2 = [AsignacionOrm, PoliticaOrm, HorarioOrm];
