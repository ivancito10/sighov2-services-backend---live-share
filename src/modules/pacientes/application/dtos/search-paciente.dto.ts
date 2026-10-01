import { IsOptional, IsString, MinLength } from 'class-validator';

export class SearchPacienteDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El término de búsqueda debe tener al menos 1 caracter' })
  q?: string;
}