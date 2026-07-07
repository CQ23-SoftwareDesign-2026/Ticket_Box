import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderPaymentTransactionDto } from './order-payment-transaction.dto';
import { OrderTicketDto } from './order-ticket.dto';

export class OrderDetailDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id!: string;

    @ApiProperty({ example: 'Concert Night' })
    concert_name!: string;

    @ApiProperty({ example: 'PAID' })
    status!: string;

    @ApiProperty({ example: '250000.00' })
    total_amount!: string;

    @ApiProperty({ format: 'date-time' })
    created_at!: Date;

    @ApiProperty({ format: 'date-time' })
    expires_at!: Date;

    @ApiProperty({ example: 2 })
    ticket_count!: number;

    @ApiPropertyOptional({ type: Object })
    ticket_metadata?: Record<string, unknown> | null;

    @ApiPropertyOptional({ example: 'John Doe' })
    user_name?: string | null;

    @ApiPropertyOptional({ example: 'john@example.com' })
    user_email?: string | null;

    @ApiProperty({ type: [OrderTicketDto] })
    tickets!: OrderTicketDto[];

    @ApiProperty({ type: [OrderPaymentTransactionDto] })
    payment_transactions!: OrderPaymentTransactionDto[];

    constructor(partial: Partial<OrderDetailDto> = {}) {
        Object.assign(this, partial);
    }
}