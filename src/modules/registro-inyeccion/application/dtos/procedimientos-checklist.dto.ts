import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ProcedimientosChecklistDto {
    @IsOptional()
    @IsBoolean()
    curacionPlana?: boolean = false;

    @IsOptional()
    @IsBoolean()
    curacionInfectada?: boolean = false;

    @IsOptional()
    @IsBoolean()
    oxigenoterapia?: boolean = false;

    @IsOptional()
    @IsBoolean()
    retiroPuntos?: boolean = false;

    @IsOptional()
    @IsBoolean()
    pruebaSensibilidad?: boolean = false;

    @IsOptional()
    @IsBoolean()
    sangria?: boolean = false;

    @IsOptional()
    @IsBoolean()
    signosVitales?: boolean = false;

    @IsOptional()
    @IsBoolean()
    txVo?: boolean = false;

    @IsOptional()
    @IsBoolean()
    orientacionSalud?: boolean = false;

    @IsOptional()
    @IsBoolean()
    vendajes?: boolean = false;

    @IsOptional()
    @IsBoolean()
    nebulizacion?: boolean = false;

    @IsOptional()
    @IsString()
    otros?: string;

    @IsOptional()
    @IsString()
    observaciones?: string;
}