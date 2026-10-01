export class UserAuth {
  constructor(
    public readonly id: number,
    public readonly username: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly estado: boolean,
    public readonly idPersona: number,
    public readonly nombreCompleto?: string,
    public readonly idEspecialista?: number | null,
  ) {}

  public estaActivo(): boolean {
    return this.estado === true;
  }
}