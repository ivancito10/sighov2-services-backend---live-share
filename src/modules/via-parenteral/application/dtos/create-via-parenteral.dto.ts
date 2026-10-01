import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateViaParenteralDto {
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @IsString()
  @MaxLength(20, { message: 'El código no debe exceder 20 caracteres' })
  codigo: string;

  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @MaxLength(100, { message: 'El nombre no debe exceder 100 caracteres' })
  nombre: string;
}