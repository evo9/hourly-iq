import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsNumber()
  @Min(2000)
  year?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number;

  @IsOptional()
  @IsNumber()
  dueAmount?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
