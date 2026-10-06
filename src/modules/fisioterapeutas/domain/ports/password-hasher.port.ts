export abstract class PasswordHasherPort {
    abstract generarTemporal(): Promise<{
        passwordTemporal: string;
        passwordHash: string;
    }>;
}
