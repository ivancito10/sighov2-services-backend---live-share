import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { DB_CONNECTIONS } from '../../../config/database.constants';
import {
    HorariosPort,
    HorarioError,
    contenida,
    validarDatos,
} from '../domain/horarios';
import type {
    Recurso,
    Filtros,
    Registro,
    Cambios,
    Asignacion,
    Horario,
    Vigencia,
} from '../domain/horarios';
const tablas = {
    asignaciones: 'asignaciones_sede',
    horarios: 'horarios_semanales',
};
const cols: Record<string, string> = {
    idSede: 'id_sede',
    idAsignacionSede: 'id_asignacion_sede',
    idPoliticaAgenda: 'id_politica_agenda',
    horaInicio: 'hora_inicio',
    horaFin: 'hora_fin',
    intervalo: 'intervalo',
    vigenteDesde: 'vigente_desde',
    vigenteHasta: 'vigente_hasta',
    estado: 'estado',
};
const selectA = `a.id::text AS id,a.id_especialista AS "idEspecialista",a.id_sede AS "idSede",a.vigente_desde::text AS "vigenteDesde",a.vigente_hasta::text AS "vigenteHasta",a.estado`;
const selectH = `h.id::text AS id,a.id_especialista AS "idEspecialista",h.id_asignacion_sede::text AS "idAsignacionSede",h.id_politica_agenda::text AS "idPoliticaAgenda",h.hora_inicio::text AS "horaInicio",h.hora_fin::text AS "horaFin",h.intervalo,h.vigente_desde::text AS "vigenteDesde",h.vigente_hasta::text AS "vigenteHasta",h.estado`;
const fromH =
    'fisioterapia.horarios_semanales h JOIN fisioterapia.asignaciones_sede a ON a.id=h.id_asignacion_sede';
const patron = (s: string) => '%' + s.replace(/[\\%_]/g, '\\$&') + '%';
@Injectable()
export class PostgresHorariosRepository implements HorariosPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly s1: DataSource,
        @InjectDataSource(DB_CONNECTIONS.ETAPA2)
        private readonly s2: DataSource,
    ) {}
    async especialista(id: number) {
        const [e] = await this.s1.query<
            { id: number; estado: boolean | null }[]
        >(
            'SELECT id,estado FROM plataforma.especialista WHERE id=$1 AND id_especialidad=89',
            [id],
        );
        return e ?? null;
    }
    private async validarEspecialista(id: number, activo: boolean) {
        const e = await this.especialista(id);
        if (!e)
            throw new HorarioError(
                404,
                'El ID no existe o no corresponde a un fisioterapeuta',
            );
        if (activo && e.estado !== true)
            throw new HorarioError(409, 'El fisioterapeuta está inactivo');
    }
    async sedes(f: Filtros) {
        const where =
            "WHERE COALESCE(piso,'') ILIKE $1 OR COALESCE(ubicacion,'') ILIKE $1 OR id::text ILIKE $1";
        const [datos, c] = await Promise.all([
            this.s1.query(
                `SELECT id,piso,ubicacion FROM plataforma.sedes ${where} ORDER BY id LIMIT $2 OFFSET $3`,
                [patron(f.buscar), f.limite, (f.pagina - 1) * f.limite],
            ),
            this.s1.query(
                `SELECT COUNT(*)::text AS total FROM plataforma.sedes ${where}`,
                [patron(f.buscar)],
            ),
        ]);
        return { datos, total: Number(c[0].total) };
    }
    async personas(f: Filtros) {
        const where =
            "WHERE ci ILIKE $1 OR COALESCE(matricula_seguro,'') ILIKE $1 OR CONCAT_WS(' ',nombres,p_apellido,s_apellido) ILIKE $1";
        const [datos, c] = await Promise.all([
            this.s1.query(
                `SELECT id,ci,complemento,nombres,p_apellido,s_apellido,matricula_seguro,sexo,fecha_nacimiento::text AS fecha_nacimiento,es_extranjero AS "esExtranjero" FROM administracion.persona ${where} ORDER BY p_apellido NULLS LAST,s_apellido NULLS LAST,nombres,id LIMIT $2 OFFSET $3`,
                [patron(f.buscar), f.limite, (f.pagina - 1) * f.limite],
            ),
            this.s1.query(
                `SELECT COUNT(*)::text AS total FROM administracion.persona ${where}`,
                [patron(f.buscar)],
            ),
        ]);
        return { datos, total: Number(c[0].total) };
    }
    async listar(recurso: Recurso, id: number, f: Filtros) {
        const alias = recurso === 'asignaciones' ? 'a' : 'h';
        const base =
            recurso === 'asignaciones'
                ? 'fisioterapia.asignaciones_sede a'
                : fromH;
        const select = recurso === 'asignaciones' ? selectA : selectH;
        const where = `WHERE a.id_especialista=$1 AND ($2::boolean IS NULL OR ${alias}.estado=$2)
        AND ($3::text IS NULL OR ($3='actual' AND (${alias}.vigente_desde IS NULL OR ${alias}.vigente_desde<=CURRENT_DATE) AND (${alias}.vigente_hasta IS NULL OR ${alias}.vigente_hasta>=CURRENT_DATE)) OR ($3='vencida' AND ${alias}.vigente_hasta<CURRENT_DATE) OR ($3='futura' AND ${alias}.vigente_desde>CURRENT_DATE))
        AND (${alias}.id::text ILIKE $4)`;
        const args = [
            id,
            f.estado ?? null,
            f.vigencia ?? null,
            patron(f.buscar),
        ];
        const [datos, c] = await Promise.all([
            this.s2.query(
                `SELECT ${select} FROM ${base} ${where} ORDER BY ${alias}.id DESC LIMIT $5 OFFSET $6`,
                [...args, f.limite, (f.pagina - 1) * f.limite],
            ),
            this.s2.query(
                `SELECT COUNT(*)::text AS total FROM ${base} ${where}`,
                args,
            ),
        ]);
        return { datos, total: Number(c[0].total) };
    }
    private async buscar(
        m: Pick<EntityManager, 'query'>,
        recurso: Recurso,
        id: string,
        lock = false,
    ): Promise<Registro | null> {
        const [row] = await m.query<Registro[]>(
            recurso === 'asignaciones'
                ? `SELECT ${selectA} FROM fisioterapia.asignaciones_sede a WHERE a.id=$1 ${lock ? 'FOR UPDATE OF a' : ''}`
                : `SELECT ${selectH} FROM ${fromH} WHERE h.id=$1 ${lock ? 'FOR UPDATE OF h' : ''}`,
            [id],
        );
        return row ?? null;
    }
    obtener(recurso: Recurso, id: string) {
        return this.buscar(this.s2, recurso, id);
    }
    async guardar(
        recurso: Recurso,
        id: string | null,
        especialista: number | null,
        actor: number,
        resolver: (actual: Registro | null) => Cambios,
    ): Promise<Registro> {
        return this.s2.transaction(async (m) => {
            // Un orden de bloqueo para asignaciones y horarios evita carreras entre ambos recursos.
            await m.query(
                "SELECT pg_advisory_xact_lock(hashtextextended('fisioterapia:configuracion-horarios',0))",
            );
            const actual =
                id === null ? null : await this.buscar(m, recurso, id, true);
            if (id !== null && !actual)
                throw new HorarioError(404, 'Registro no encontrado');
            const d = resolver(actual);
            const nuevo = {
                ...actual,
                ...d,
                estado: d.estado ?? actual?.estado ?? true,
            };
            const idEspecialista = actual?.idEspecialista ?? especialista!;
            await this.validarEspecialista(
                idEspecialista,
                nuevo.estado === true,
            );
            if (recurso === 'asignaciones')
                await this.validarAsignacion(
                    m,
                    id,
                    idEspecialista,
                    nuevo as unknown as Asignacion,
                    d,
                );
            else
                await this.validarHorario(
                    m,
                    id,
                    idEspecialista,
                    nuevo as unknown as Horario,
                    d,
                );
            const entries = Object.entries(d);
            const values: unknown[] = entries.map(([, v]) => v);
            if (id === null) {
                const campos = entries.map(([k]) => cols[k]);
                if (recurso === 'asignaciones') {
                    campos.push('id_especialista');
                    values.push(idEspecialista);
                }
                campos.push(
                    'estado',
                    'id_user_created',
                    'created_at',
                    'updated_at',
                );
                const placeholders = values.map((_, i) => '$' + (i + 1));
                placeholders.push(
                    'true',
                    '$' + (values.length + 1),
                    'NOW()',
                    'NOW()',
                );
                values.push(actor);
                const [row] = await m.query<{ id: string }[]>(
                    `INSERT INTO fisioterapia.${tablas[recurso]} (${campos.join(',')}) VALUES (${placeholders.join(',')}) RETURNING id::text AS id`,
                    values,
                );
                id = row.id;
            } else {
                const sets = entries.map(([k], i) => `${cols[k]}=$${i + 1}`);
                sets.push(
                    `id_user_updated=$${values.length + 1}`,
                    'updated_at=NOW()',
                );
                values.push(actor, id);
                await m.query(
                    `UPDATE fisioterapia.${tablas[recurso]} SET ${sets.join(',')} WHERE id=$${values.length}`,
                    values,
                );
            }
            return (await this.buscar(m, recurso, id))!;
        });
    }
    private async validarAsignacion(
        m: EntityManager,
        id: string | null,
        especialista: number,
        n: Asignacion,
        d: Cambios,
    ) {
        if (Object.keys(d).length === 1 && d.estado === false) return;
        const [sede] = await this.s1.query(
            'SELECT id FROM plataforma.sedes WHERE id=$1',
            [n.idSede],
        );
        if (!sede) throw new HorarioError(404, 'Sede no encontrada');
        if (id && Object.keys(d).some((k) => k !== 'estado')) {
            const [uso] = await m.query(
                'SELECT EXISTS(SELECT 1 FROM fisioterapia.horarios_semanales WHERE id_asignacion_sede=$1) AS usado',
                [id],
            );
            if (uso.usado)
                throw new HorarioError(
                    409,
                    'La asignación tiene horarios; conserve el historial y registre otra asignación',
                );
        }
        if (n.estado === true) {
            const rows = await m.query(
                `SELECT id FROM fisioterapia.asignaciones_sede WHERE id_especialista=$1 AND id_sede=$2 AND estado=true AND ($3::bigint IS NULL OR id<>$3) AND COALESCE(vigente_desde,'-infinity'::date)<=COALESCE($5::date,'infinity'::date) AND COALESCE(vigente_hasta,'infinity'::date)>=COALESCE($4::date,'-infinity'::date) LIMIT 1`,
                [especialista, n.idSede, id, n.vigenteDesde, n.vigenteHasta],
            );
            if (rows.length)
                throw new HorarioError(
                    409,
                    'Ya existe una asignación activa para esa sede en la misma vigencia',
                );
            // Reactivar no debe habilitar horarios que choquen con otra asignación.
            if (id) {
                const horarios = await m.query<Horario[]>(
                    `SELECT ${selectH} FROM ${fromH} WHERE a.id=$1 AND h.estado=true`,
                    [id],
                );
                for (const h of horarios)
                    await this.sinSolapamiento(m, h.id, especialista, h);
            }
        }
    }
    private async validarHorario(
        m: EntityManager,
        id: string | null,
        especialista: number,
        n: Horario,
        d: Cambios,
    ) {
        if (id && Object.keys(d).some((k) => k !== 'estado')) {
            const [uso] = await m.query(
                'SELECT EXISTS(SELECT 1 FROM fisioterapia.citas WHERE id_horario_semanal=$1) AS usado',
                [id],
            );
            if (uso.usado)
                throw new HorarioError(
                    409,
                    'El horario tiene citas; registre otro bloque para conservar el historial',
                );
        }
        // La baja nunca modifica citas ni requiere que la política siga habilitada.
        if (Object.keys(d).length === 1 && d.estado === false) return;
        validarDatos('horarios', n as unknown as Record<string, unknown>);
        const a = (await this.buscar(
            m,
            'asignaciones',
            n.idAsignacionSede,
            true,
        )) as Asignacion | null;
        if (!a || a.idEspecialista !== especialista)
            throw new HorarioError(
                404,
                'La asignación no pertenece a este fisioterapeuta',
            );
        const [politica] = await m.query<(Vigencia & { estado: boolean })[]>(
            'SELECT estado,vigente_desde::text AS "vigenteDesde",vigente_hasta::text AS "vigenteHasta" FROM fisioterapia.politicas_agenda WHERE id=$1 FOR SHARE',
            [n.idPoliticaAgenda],
        );
        if (!politica)
            throw new HorarioError(404, 'Política de agenda no encontrada');
        if (
            n.estado === true &&
            (a.estado !== true || politica.estado !== true)
        )
            throw new HorarioError(
                409,
                'Asignación y política deben estar activas',
            );
        contenida(n, a);
        contenida(n, politica);
        if (n.estado === true)
            await this.sinSolapamiento(m, id, especialista, n);
    }
    private async sinSolapamiento(
        m: EntityManager,
        id: string | null,
        especialista: number,
        n: Horario,
    ) {
        const rows = await m.query(
            `SELECT h.id FROM fisioterapia.horarios_semanales h JOIN fisioterapia.asignaciones_sede a ON a.id=h.id_asignacion_sede WHERE a.id_especialista=$1 AND a.estado=true AND h.estado=true AND ($2::bigint IS NULL OR h.id<>$2) AND h.hora_inicio<$4::time AND h.hora_fin>$3::time AND COALESCE(h.vigente_desde,'-infinity'::date)<=COALESCE($6::date,'infinity'::date) AND COALESCE(h.vigente_hasta,'infinity'::date)>=COALESCE($5::date,'-infinity'::date) LIMIT 1`,
            [
                especialista,
                id,
                n.horaInicio,
                n.horaFin,
                n.vigenteDesde,
                n.vigenteHasta,
            ],
        );
        if (rows.length)
            throw new HorarioError(
                409,
                'El fisioterapeuta tiene otro horario activo que se solapa, incluso en otra sede',
            );
    }
}
