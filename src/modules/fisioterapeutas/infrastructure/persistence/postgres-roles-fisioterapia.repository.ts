import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { RolesFisioterapiaPort } from '../../domain/ports/roles-fisioterapia.port';
import { configuracionRoles } from '../security/configuracion-roles';
@Injectable()
export class PostgresRolesFisioterapiaRepository implements RolesFisioterapiaPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly source: DataSource,
        private readonly config: ConfigService,
    ) {}
    async esEncargado(idUsuario: string): Promise<boolean> {
        const { modelType, guardName } = configuracionRoles(this.config);
        const rows = await this.source.query(
            `SELECT 1 FROM administracion.model_has_roles mr
   JOIN administracion.roles r ON r.id=mr.role_id JOIN administracion.users u ON u.id=mr.model_id
   WHERE mr.model_id=$1 AND mr.model_type=$2 AND r.guard_name=$3 AND r.name=$4
   AND r.role_enabled=true AND u.estado=true LIMIT 1`,
            [idUsuario, modelType, guardName, 'Encargado de Fisioterapia'],
        );
        return rows.length > 0;
    }
}
