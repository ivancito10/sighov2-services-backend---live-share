import { IsOptional, IsString, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationPacienteDto {
  @IsOptional()
  @IsString()
  q?: string; // Búsqueda general en todos los campos

  @IsOptional()
  @IsString()
  ci?: string; // Solo CI y complemento

  @IsOptional()
  @IsString()
  matricula?: string; // Solo Matrícula de seguro

  @IsOptional()
  @IsString()
  nombre?: string; // Solo Nombres y apellidos

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  limit?: number = 20;
}