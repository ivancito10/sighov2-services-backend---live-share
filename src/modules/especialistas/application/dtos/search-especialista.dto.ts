import {
    IsOptional,
    IsString,
    IsInt,
    Min,
    Max,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchEspecialistaDto {
    @IsOptional()
    @IsString()
    q?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    buscar?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    especialidad?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    idEspecialidad?: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(1000000)
    pagina: number = 1;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limite: number = 20;
}
