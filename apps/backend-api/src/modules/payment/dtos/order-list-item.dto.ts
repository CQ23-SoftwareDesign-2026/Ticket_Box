import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderListItemDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id!: string;

    @ApiProperty({ example: 'Concert Night' })
    concert_name!: string;

    @ApiProperty({ example: 'PENDING' })
    status!: string;

    @ApiProperty({ example: '250000.00' })
    total_amount!: string;

    @ApiProperty({ format: 'date-time' })
    created_at!: Date;

    @ApiProperty({ format: 'date-time' })
    expires_at!: Date;

    @ApiProperty({ example: 2 })
    ticket_count!: number;

    @ApiPropertyOptional({ example: 'VNPAY' })
    latest_payment_method?: string | null;

    @ApiPropertyOptional({ example: 'INIT' })
    latest_payment_status?: string | null;

    @ApiPropertyOptional({ example: 'John Doe' })
    user_name?: string | null;

    @ApiPropertyOptional({ example: 'john@example.com' })
    user_email?: string | null;

    constructor(partial: Partial<OrderListItemDto> = {}) {
        Object.assign(this, partial);
    }
}