import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../config/database.constants';
import { OrdenesPort } from '../domain/orden';
import type {
    OrdenBase,
    Orden,
    PersonaOrden,
    EmisorOrden,
    FiltroOrdenes,
} from '../domain/orden';

const columnasOrden =
    'id::text AS id,nro_solicitud,nro_sesion,indicaciones,id_persona,id_user_created::text AS id_user_created';
const columnasPersona = `p.id,p.nombres,p.p_apellido,p.s_apellido,p.ci,p.complemento,p.matricula_seguro,p.sexo,p.fecha_nacimiento::text AS fecha_nacimiento,p.es_extranjero`;

@Injectable()
export class PostgresOrdenesRepository implements OrdenesPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.ETAPA2)
        private readonly etapa2: DataSource,
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly etapa1: DataSource,
    ) {}
    async listar({ pagina, limite }: FiltroOrdenes) {
        const [ordenes, conteo] = await Promise.all([
            this.etapa2.query<OrdenBase[]>(
                `SELECT ${columnasOrden} FROM consulta_externa.sol_fisioterapia ORDER BY id DESC LIMIT $1 OFFSET $2`,
                [limite, (pagina - 1) * limite],
            ),
            this.etapa2.query<{ total: string }[]>(
                'SELECT COUNT(*)::text AS total FROM consulta_externa.sol_fisioterapia',
            ),
        ]);
        return {
            datos: await this.completar(ordenes),
            total: Number(conteo[0].total),
        };
    }
    async obtener(id: string) {
        const ordenes = await this.etapa2.query<OrdenBase[]>(
            `SELECT ${columnasOrden} FROM consulta_externa.sol_fisioterapia WHERE id=$1`,
            [id],
        );
        return (await this.completar(ordenes))[0] ?? null;
    }
    private async completar(ordenes: OrdenBase[]): Promise<Orden[]> {
        if (!ordenes.length) return [];
        const idsPacientes = [
            ...new Set(
                ordenes.flatMap((o) =>
                    o.id_persona === null ? [] : [o.id_persona],
                ),
            ),
        ];
        const idsUsuarios = [
            ...new Set(
                ordenes.flatMap((o) =>
                    o.id_user_created === null ? [] : [o.id_user_created],
                ),
            ),
        ];
        // Consultas por lote: no se hace una consulta adicional por cada orden.
        const [pacientes, emisores] = await Promise.all([
            idsPacientes.length
                ? this.etapa1.query<PersonaOrden[]>(
                      `SELECT ${columnasPersona} FROM administracion.persona p WHERE p.id=ANY($1::int[])`,
                      [idsPacientes],
                  )
                : Promise.resolve([]),
            idsUsuarios.length
                ? this.etapa1.query<EmisorOrden[]>(
                      `
                SELECT u.id::text AS id_user,u.id_persona,
                    CASE WHEN p.id IS NULL THEN NULL ELSE (
                        SELECT row_to_json(datos) FROM (SELECT ${columnasPersona}) datos
                    ) END AS persona,
                    COALESCE((
                        SELECT json_agg(json_build_object(
                            'id',e.id,'grado_academico',e.grado_academico,'estado',e.estado,
                            'especialidad',CASE WHEN esp.id IS NULL THEN NULL ELSE json_build_object('id',esp.id,'nombre',esp.especialidad) END
                        ) ORDER BY e.id)
                        FROM plataforma.especialista e
                        LEFT JOIN administracion.especialidad esp ON esp.id=e.id_especialidad
                        WHERE e.id_persona=u.id_persona
                    ),'[]'::json) AS especialistas
                FROM administracion.users u
                LEFT JOIN administracion.persona p ON p.id=u.id_persona
                WHERE u.id=ANY($1::bigint[])
            `,
                      [idsUsuarios],
                  )
                : Promise.resolve([]),
        ]);
        const porPersona = new Map(pacientes.map((p) => [p.id, p]));
        const porUsuario = new Map(emisores.map((u) => [u.id_user, u]));
        return ordenes.map((o) => ({
            ...o,
            paciente:
                o.id_persona === null
                    ? null
                    : (porPersona.get(o.id_persona) ?? null),
            emisor:
                o.id_user_created === null
                    ? null
                    : (porUsuario.get(o.id_user_created) ?? null),
        }));
    }
}
