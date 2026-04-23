import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['USD', 'EUR', 'UAH'])
  currency?: string;

  @IsOptional()
  @IsNumber()
  defaultRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
