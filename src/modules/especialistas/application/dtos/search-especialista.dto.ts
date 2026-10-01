import { IsOptional, IsString } from 'class-validator';

export class SearchEspecialistaDto {
    @IsOptional()
    @IsString()
    q?: string;
}