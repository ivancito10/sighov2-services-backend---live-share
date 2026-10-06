import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserAuthRepositoryPort } from '../../domain/ports/user-auth.repository.port';
import { UserAuth } from '../../domain/entities/user-auth.entity';
import {
    UsuarioOrm,
    EspecialistaOrm,
} from '../../../../common/persistence/orm/entities';
import { nombreCompleto } from '../../../../common/persistence/orm/lecturas';
@Injectable()
export class PostgresUserAuthRepository implements UserAuthRepositoryPort {
    constructor(@InjectDataSource('sighov') private readonly db: DataSource) {}
    async buscarPorCredencial(termino: string): Promise<UserAuth | null> {
        const u = await this.db
            .getRepository(UsuarioOrm)
            .createQueryBuilder('u')
            .addSelect('u.password')
            .innerJoinAndSelect('u.persona', 'p')
            .where([{ name: termino }, { email: termino }])
            .orderBy('u.id', 'ASC')
            .getOne();
        if (!u) return null;
        const especialista = await this.db
            .getRepository(EspecialistaOrm)
            .findOne({
                where: { idPersona: u.idPersona!, estado: true },
                select: { id: true },
                order: { id: 'ASC' },
            });
        return new UserAuth(
            Number(u.id),
            u.name,
            u.email,
            u.password.replace(/^\$2y\$/, '$2b$'),
            u.estado === true,
            u.idPersona!,
            nombreCompleto(u.persona!),
            especialista?.id ?? null,
        );
    }
    async actualizarUltimoLogin(id: number): Promise<void> {
        await this.db
            .getRepository(UsuarioOrm)
            .update({ id: String(id) }, { lastLoginAt: new Date() });
    }
}