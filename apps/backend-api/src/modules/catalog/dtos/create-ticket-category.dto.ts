import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, IsIn } from 'class-validator';

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
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ example: 'book_now', enum: ['sale_closed', 'sold_out', 'book_now'] })
  @IsString()
  @IsIn(['sale_closed', 'sold_out', 'book_now'])
  @IsOptional()
  status?: string;
}

