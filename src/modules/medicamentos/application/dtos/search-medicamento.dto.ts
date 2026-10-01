import { IsOptional, IsString } from 'class-validator';

export class SearchMedicamentoDto {
    @IsOptional()
    @IsString()
    q?: string;
}