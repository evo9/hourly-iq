import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  paidAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
