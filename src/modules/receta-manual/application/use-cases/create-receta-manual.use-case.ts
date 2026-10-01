import { Injectable, BadRequestException } from '@nestjs/common';
import { RecetaManualRepositoryPort } from '../../domain/ports/receta-manual.repository.port';
import { CreateRecetaManualDto } from '../dtos/create-receta-manual.dto';

@Injectable()
export class CreateRecetaManualUseCase {
    constructor(private readonly repo: RecetaManualRepositoryPort) { }

    async ejecutar(dto: CreateRecetaManualDto, idUsuario?: number) {
        if (!dto.idPersona || !dto.idMedicamento || !dto.fechaReceta) {
            throw new BadRequestException('Faltan campos obligatorios para registrar la receta física/manual');
        }

        return await this.repo.crear({
            idPersona: dto.idPersona,
            idEspecialista: dto.idEspecialista ?? null,
            idMedicamento: dto.idMedicamento,
            fechaReceta: dto.fechaReceta,
            idUserCreated: idUsuario ?? null,
        });
    }
}