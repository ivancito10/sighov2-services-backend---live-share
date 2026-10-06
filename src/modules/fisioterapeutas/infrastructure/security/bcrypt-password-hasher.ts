import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
export class BcryptPasswordHasher implements PasswordHasherPort {
    async generarTemporal() {
        const passwordTemporal = randomBytes(18).toString('base64url');
        return {
            passwordTemporal,
            passwordHash: await bcrypt.hash(passwordTemporal, 12),
        };
    }
}
