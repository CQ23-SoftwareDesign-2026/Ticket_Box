import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTicketCategoryDto {
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

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  gate_number?: number;
}

