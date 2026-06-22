import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderTicketDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id!: string;

    @ApiProperty({ example: 'f6c2a9c4-0e88-4b7c-8b9d-2e93c1c5c1b1' })
    category_id!: string;

    @ApiProperty({ example: 'SVIP' })
    category_name!: string;

    @ApiProperty({ example: '5b83f5e5e6bff8e6b9e8d2d0d2d0d2d0d2d0d2d0d2d0d2d0d2d0d2d0d2d0d2d0' })
    qr_code_hash!: string;

    @ApiProperty({ example: false })
    is_scanned!: boolean;

    @ApiPropertyOptional({ format: 'date-time' })
    scanned_at?: Date | null;

    @ApiPropertyOptional({ example: 1, description: 'The assigned gate number for this ticket' })
    gate_number?: number | null;

    constructor(partial: Partial<OrderTicketDto> = {}) {
        Object.assign(this, partial);
    }
}