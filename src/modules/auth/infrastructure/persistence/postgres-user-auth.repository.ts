import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { UserAuthRepositoryPort } from '../../domain/ports/user-auth.repository.port';
import { UserAuth } from '../../domain/entities/user-auth.entity';

@Injectable()
export class PostgresUserAuthRepository implements UserAuthRepositoryPort {
  constructor(
    @InjectDataSource(DB_CONNECTIONS.SIGHOV)
    private readonly dataSource: DataSource,
  ) {}

  async buscarPorCredencial(termino: string): Promise<UserAuth | null> {
    const query = `
      SELECT 
        u.id, 
        u.name AS username, 
        u.email, 
        REPLACE(u.password, '$2y$', '$2b$') AS password, 
        u.estado, 
        u.id_persona,
        TRIM(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) AS nombre_completo,
        e.id AS id_especialista
      FROM administracion.users u
      INNER JOIN administracion.persona p ON p.id = u.id_persona
      LEFT JOIN plataforma.especialista e ON e.id_persona = p.id AND e.estado = true
      WHERE (u.name = $1 OR u.email = $1)
      LIMIT 1;
    `;

    const rows = await this.dataSource.query(query, [termino]);
    if (!rows || rows.length === 0) return null;

    const r = rows[0];
    return new UserAuth(
      r.id,
      r.username,
      r.email,
      r.password,
      r.estado,
      r.id_persona,
      r.nombre_completo,
      r.id_especialista,
    );
  }

  async actualizarUltimoLogin(idUsuario: number): Promise<void> {
    await this.dataSource.query(
      `UPDATE administracion.users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [idUsuario],
    );
  }
}