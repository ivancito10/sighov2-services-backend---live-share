import {
    ValidateIf,
    IsBoolean,
    IsString,
    IsNotEmpty,
    MaxLength,
    Matches,
    IsIn,
    IsInt,
    Min,
    Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
const Opcional = () => ValidateIf((_o, v) => v !== undefined);
const Nullable = () => ValidateIf((_o, v) => v !== undefined && v !== null);
const Trim = () =>
    Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    );
export class EditarFisioterapeutaDto {
    @Opcional() @IsBoolean() esExtranjero?: boolean;
    @Opcional()
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    @Matches(/^[a-zA-Z0-9]+$/)
    ci?: string;
    @Nullable()
    @Trim()
    @IsString()
    @MaxLength(10)
    @Matches(/^[a-zA-Z0-9]*$/)
    complemento?: string | null;
    @Opcional()
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @Matches(/^[\p{L}\p{M} '�-]+$/u)
    nombres?: string;
    @Nullable()
    @Trim()
    @IsString()
    @MaxLength(100)
    @Matches(/^[\p{L}\p{M} '�-]*$/u)
    primerApellido?: string | null;
    @Nullable()
    @Trim()
    @IsString()
    @MaxLength(100)
    @Matches(/^[\p{L}\p{M} '�-]*$/u)
    segundoApellido?: string | null;
    @Opcional() @IsIn(['M', 'F']) sexo?: 'M' | 'F';
    @Opcional()
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    fechaNacimiento?: string;
    @Opcional() @IsInt() @Min(1) @Max(2147483647) idEstadoCivil?: number;
    @Opcional() @IsInt() @Min(1) @Max(2147483647) idDeptExp?: number;
    @Opcional() @IsIn(['EVENTUAL', 'PERMANENTE']) tipoContrato?:
        'EVENTUAL' | 'PERMANENTE';
    @Nullable() @IsString() @MaxLength(10) fechaContratoInicio?: string | null;
    @Nullable() @IsString() @MaxLength(10) fechaContratoFin?: string | null;
    @Opcional() @IsIn(['DOCTOR', 'LICENCIADO']) gradoAcademico?:
        'DOCTOR' | 'LICENCIADO';
}
export class EstadoFisioterapeutaDto {
    @IsBoolean() estado: boolean;
}
