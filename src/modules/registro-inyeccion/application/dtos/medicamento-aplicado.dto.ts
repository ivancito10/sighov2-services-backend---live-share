import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MedicamentoAplicadoDto {
    @IsNotEmpty({ message: 'El idMedicamento es obligatorio' })
    @IsInt({ message: 'El idMedicamento debe ser un entero' })
    idMedicamento: number;

    @IsOptional()
    @IsString()
    observacion?: string;
}