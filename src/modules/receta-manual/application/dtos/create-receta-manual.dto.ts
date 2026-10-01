import { IsDateString, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRecetaManualDto {
    @IsNotEmpty({ message: 'El idPersona (paciente) es obligatorio' })
    @IsInt({ message: 'El idPersona debe ser un número entero' })
    idPersona: number;

    @IsOptional()
    @IsInt({ message: 'El idEspecialista debe ser un número entero' })
    idEspecialista?: number;

    @IsNotEmpty({ message: 'El idMedicamento es obligatorio' })
    @IsInt({ message: 'El idMedicamento debe ser un número entero' })
    idMedicamento: number;

    @IsNotEmpty({ message: 'La fecha de la receta es obligatoria' })
    @IsDateString({}, { message: 'La fechaReceta debe tener un formato válido (YYYY-MM-DD)' })
    fechaReceta: string;
}