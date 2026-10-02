import { IsInt, IsOptional, ValidateNested, IsArray, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { MedicamentoAplicadoDto } from './medicamento-aplicado.dto';
import { ProcedimientosChecklistDto } from './procedimientos-checklist.dto';

export class UpdateRegistroInyeccionDto {
    @IsOptional()
    @IsInt()
    idPersona?: number;

    @IsOptional()
    @IsInt()
    idEspecialista?: number;

    @IsOptional()
    @IsDateString()
    fechaReceta?: string;

    @IsOptional()
    @IsInt()
    idViaParenteral?: number;

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