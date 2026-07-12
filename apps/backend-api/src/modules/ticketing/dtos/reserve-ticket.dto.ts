import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsInt, IsUUID, Max, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReserveItemDto {
    @ApiProperty({ example: 'f6c2a9c4-0e88-4b7c-8b9d-2e93c1c5c1b1', description: 'ID of the ticket category' })
    @IsUUID()
    category_id!: string;

    @ApiProperty({ example: 2, minimum: 1, description: 'Number of tickets to reserve' })
    @IsInt()
    @Min(1)
    @Max(20)
    quantity!: number;
}

export class ReserveTicketDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID of the concert' })
    @IsUUID()
    concert_id!: string;

    @ApiProperty({ type: [ReserveItemDto], description: 'List of ticket categories to reserve' })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(10)
    @ValidateNested({ each: true })
    @Type(() => ReserveItemDto)
    items!: ReserveItemDto[];
}

export class InitCategoryDto {
    @ApiProperty({ example: 'f6c2a9c4-0e88-4b7c-8b9d-2e93c1c5c1b1', description: 'ID of the ticket category' })
    @IsUUID()
    category_id!: string;

    @ApiProperty({ example: 10, minimum: 0, description: 'Number of available tickets' })
    @IsInt()
    @Min(0)
    available!: number;

    @ApiProperty({ example: 4, minimum: 1, description: 'Max tickets per user' })
    @IsInt()
    @Min(1)
    max_per_user!: number;
}
