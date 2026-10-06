import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { RolesFisioterapiaPort } from '../../domain/ports/roles-fisioterapia.port';
import { configuracionRoles } from '../security/configuracion-roles';
import {
    UsuarioOrm,
    ModeloRolOrm,
} from '../../../../common/persistence/orm/entities';
@Injectable()
export class PostgresRolesFisioterapiaRepository implements RolesFisioterapiaPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.SIGHOV)
        private readonly source: DataSource,
        private readonly config: ConfigService,
    ) {}
    async esEncargado(idUsuario: string): Promise<boolean> {
        const { modelType, guardName } = configuracionRoles(this.config);
        if (
            !(await this.source
                .getRepository(UsuarioOrm)
                .existsBy({ id: idUsuario, estado: true }))
        )
            return false;
        return this.source.getRepository(ModeloRolOrm).exists({
            where: {
                modelId: idUsuario,
                modelType,
                rol: {
                    guardName,
                    name: 'Encargado de Fisioterapia',
                    habilitado: true,
                },
            },
        });
    }
}