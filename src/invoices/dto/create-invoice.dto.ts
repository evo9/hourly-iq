import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateInvoiceDto {
  @IsNumber()
  clientId: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(2000)
  year: number;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsNumber()
  @Min(0)
  hours: number;

  @IsOptional()
  @IsNumber()
  dueAmount?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
