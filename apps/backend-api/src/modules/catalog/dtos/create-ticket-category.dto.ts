import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTicketCategoryDto {
  @ApiPropertyOptional({ example: '7d9e4e35-5a1b-4458-bda4-5de2a317a0f4' })
  @IsString()
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'SVIP' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @Min(1)
  price!: number;

  @ApiProperty({ example: 200 })
  @IsInt()
  @Min(1)
  total_quantity!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  max_per_user!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  gate_number?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ example: 'available' })
  @IsString()
  @IsOptional()
  status?: string;
}

