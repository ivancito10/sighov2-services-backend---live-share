import {
    IsString,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsIn,
    IsInt,
    Min,
    Max,
    MaxLength,
    Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
const Trim = () =>
    Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    );
export class CrearFisioterapeutaDto {
    @IsBoolean() esExtranjero: boolean;
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    @Matches(/^[a-zA-Z0-9]+$/)
    ci: string;
    @Trim()
    @IsOptional()
    @IsString()
    @MaxLength(10)
    @Matches(/^[a-zA-Z0-9]*$/)
    complemento?: string | null;
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @Matches(/^[\p{L}\p{M} '’-]+$/u)
    nombres: string;
    @Trim()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Matches(/^[\p{L}\p{M} '’-]*$/u)
    primerApellido?: string | null;
    @Trim()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Matches(/^[\p{L}\p{M} '’-]*$/u)
    segundoApellido?: string | null;
    @IsIn(['M', 'F']) sexo: 'M' | 'F';
    @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) fechaNacimiento: string;
    @IsInt() @Min(1) @Max(2147483647) idEstadoCivil: number;
    @IsInt() @Min(1) @Max(2147483647) idDeptExp: number;
    @IsIn(['EVENTUAL', 'PERMANENTE']) tipoContrato: 'EVENTUAL' | 'PERMANENTE';
    @IsOptional() @IsString() @MaxLength(10) fechaContratoInicio?:
        string | null;
    @IsOptional() @IsString() @MaxLength(10) fechaContratoFin?: string | null;
    @IsIn(['DOCTOR', 'LICENCIADO']) gradoAcademico: 'DOCTOR' | 'LICENCIADO';
}
