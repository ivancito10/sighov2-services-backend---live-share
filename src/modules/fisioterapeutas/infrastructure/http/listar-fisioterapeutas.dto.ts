import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
export class ListarFisioterapeutasDto {
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @MaxLength(100)
    buscar: string = '';
    @Type(() => Number) @IsInt() @Min(1) @Max(1000000) pagina: number = 1;
    @Type(() => Number) @IsInt() @Min(1) @Max(100) limite: number = 20;
}

export class IdFisioterapeutaDto {
    @IsString() @Matches(/^[1-9]\d{0,18}$/) id: string;
}
