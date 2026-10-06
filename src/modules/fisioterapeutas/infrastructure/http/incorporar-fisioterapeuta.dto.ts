import {
    IsInt,
    Min,
    Max,
    IsString,
    Matches,
    ValidateIf,
} from 'class-validator';
import { CrearFisioterapeutaDto } from './crear-fisioterapeuta.dto';
export class IncorporarFisioterapeutaDto extends CrearFisioterapeutaDto {
    @IsInt() @Min(1) @Max(2147483647) idPersona: number;
    @ValidateIf((_o, v) => v !== undefined)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    idEspecialista?: number;
    @ValidateIf((_o, v) => v !== undefined)
    @IsString()
    @Matches(/^[1-9]\d{0,18}$/)
    idUsuario?: string;
}