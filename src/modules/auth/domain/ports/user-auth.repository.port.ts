import { UserAuth } from '../entities/user-auth.entity';

export abstract class UserAuthRepositoryPort {
  abstract buscarPorCredencial(termino: string): Promise<UserAuth | null>;
  abstract actualizarUltimoLogin(idUsuario: number): Promise<void>;
}