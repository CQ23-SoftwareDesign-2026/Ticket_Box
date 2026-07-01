import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../shared/dtos/pagination.dto';

export class QueryCheckerAssignmentDto extends PaginationDto {
    @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Filter by concert ID' })
    @IsOptional()
    @IsUUID()
    concert_id?: string;

    @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Filter by checker ID' })
    @IsOptional()
    @IsUUID()
    checker_id?: string;
}

export class CreateCheckerAssignmentDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID of the user who has the Checker role' })
    @IsUUID()
    @IsNotEmpty()
    checker_id!: string;

    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'ID of the concert' })
    @IsUUID()
    @IsNotEmpty()
    concert_id!: string;

    @ApiProperty({ example: 1, description: 'The gate number assigned' })
    @IsInt()
    @IsNotEmpty()
    gate_number!: number;
}

export class UpdateCheckerAssignmentDto {
    @ApiProperty({ example: 2, description: 'The new gate number assigned' })
    @IsInt()
    @IsNotEmpty()
    gate_number!: number;
}
