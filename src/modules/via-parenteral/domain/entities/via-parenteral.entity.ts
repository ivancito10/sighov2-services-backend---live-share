export class ViaParenteral {
  constructor(
    public readonly id: number,
    public readonly codigo: string,
    public readonly nombre: string,
    public readonly estado: boolean,
    public readonly idUserCreated?: number | null,
    public readonly idUserUpdated?: number | null,
    public readonly createdAt?: Date | null,
    public readonly updatedAt?: Date | null,
  ) {}
}