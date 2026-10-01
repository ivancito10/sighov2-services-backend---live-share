import { BadRequestException, Injectable } from '@nestjs/common';
import { ViaParenteralRepositoryPort } from '../../domain/ports/via-parenteral.repository.port';
import { CreateViaParenteralDto } from '../dtos/create-via-parenteral.dto';

@Injectable()
export class CreateViaParenteralUseCase {
  constructor(private readonly repo: ViaParenteralRepositoryPort) {}

  async ejecutar(dto: CreateViaParenteralDto, idUser?: number) {
    const existe = await this.repo.buscarPorCodigo(dto.codigo.trim().toUpperCase());
    if (existe) {
      throw new BadRequestException(`Ya existe una vía parenteral con el código ${dto.codigo}`);
    }

    return await this.repo.crear({
      codigo: dto.codigo.trim().toUpperCase(),
      nombre: dto.nombre.trim(),
      idUserCreated: idUser,
    });
  }
}