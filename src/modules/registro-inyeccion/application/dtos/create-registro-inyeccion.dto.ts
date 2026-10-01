import { IsInt, IsNotEmpty, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { MedicamentoAplicadoDto } from './medicamento-aplicado.dto';
import { ProcedimientosChecklistDto } from './procedimientos-checklist.dto';

export class CreateRegistroInyeccionDto {
    @IsNotEmpty({ message: 'El idPersona (paciente) es obligatorio' })
    @IsInt()
    idPersona: number;

    @IsOptional()
    @IsInt()
    idEspecialista?: number;

    @IsOptional()
    @IsInt()
    idViaParenteral?: number;

    @IsOptional()
    @IsInt()
    idReceta?: number;

    @IsOptional()
    @IsInt()
    idRecetaManual?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MedicamentoAplicadoDto)
    medicamentos?: MedicamentoAplicadoDto[];

    @IsOptional()
    @ValidateNested()
    @Type(() => ProcedimientosChecklistDto)
    procedimientos?: ProcedimientosChecklistDto;
}