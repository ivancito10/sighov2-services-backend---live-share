export abstract class RolesFisioterapiaPort {
    abstract esEncargado(idUsuario: string): Promise<boolean>;
}
