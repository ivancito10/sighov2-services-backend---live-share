import { BadRequestException, Injectable } from '@nestjs/common';
import { RegistroInyeccionRepositoryPort } from '../../domain/ports/registro-inyeccion.repository.port';
import { CreateRegistroInyeccionDto } from '../dtos/create-registro-inyeccion.dto';

@Injectable()
export class CreateRegistroInyeccionUseCase {
    constructor(private readonly repo: RegistroInyeccionRepositoryPort) { }

    async ejecutar(dto: CreateRegistroInyeccionDto, idUsuario?: number) {
        if (!dto.idPersona) {
            throw new BadRequestException('El paciente es obligatorio para registrar la inyección');
        }

        if (!dto.idReceta && !dto.idRecetaManual) {
            throw new BadRequestException('Debe asociar una Receta del Sistema o una Receta Manual de respaldo');
        }

        const resultado = await this.repo.crearTransaccionCompleta({
            idPersona: dto.idPersona,
            idEspecialista: dto.idEspecialista,
            idViaParenteral: dto.idViaParenteral,
            idReceta: dto.idReceta,
            idRecetaManual: dto.idRecetaManual,
            idUsuario: idUsuario ?? null,
            medicamentos: dto.medicamentos,
            procedimientos: dto.procedimientos,
        });

        return {
            exito: true,
            mensaje: 'Registro de inyección y procedimientos guardado correctamente',
            datos: resultado,
        };
    }
}