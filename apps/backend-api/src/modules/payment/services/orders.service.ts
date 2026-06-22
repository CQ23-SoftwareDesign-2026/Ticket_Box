import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma.service';
import { PaginationMetaDto } from '../../../shared/dtos/pagination-meta.dto';
import { OrderListQueryDto } from '../dtos/order-list-query.dto';
import { AdminOrderListQueryDto } from '../dtos/admin-order-list-query.dto';
import { OrderListResponseDto } from '../dtos/order-list-response.dto';
import { OrderListItemDto } from '../dtos/order-list-item.dto';
import { OrderDetailDto } from '../dtos/order-detail.dto';
import { OrderTicketDto } from '../dtos/order-ticket.dto';
import { OrderPaymentTransactionDto } from '../dtos/order-payment-transaction.dto';
import { TicketingService } from '../../ticketing/services/ticketing.service';
import { BadRequestException } from '@nestjs/common';

type OrderListRow = {
    id: string;
    concert: { name: string };
    status: string;
    total_amount: { toString(): string } | string;
    created_at: Date;
    expires_at: Date;
    tickets: Array<{ id: string }>;
    payment_transactions: Array<{ payment_method: string; status: string | null }>;
};

type OrderDetailRow = OrderListRow & {
    ticket_metadata: unknown;
    tickets: Array<{
        id: string;
        category_id: string;
        qr_code_hash: string;
        is_scanned: boolean;
        scanned_at: Date | null;
        category: { name: string; gate_number: number | null };
    }>;
    payment_transactions: Array<{
        id: string;
        payment_method: string;
        status: string | null;
        transaction_id_3rd_party: string | null;
        amount: { toString(): string } | string;
        idempotency_key: string;
        raw_response: unknown;
        created_at: Date;
        updated_at: Date;
    }>;
};

@Injectable()
export class OrdersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ticketingService: TicketingService,
    ) { }

    async getOrderHistory(userId: string, query: OrderListQueryDto): Promise<OrderListResponseDto> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = Math.max(0, (page - 1) * limit);
        const where = {
            user_id: userId,
            ...(query.status ? { status: query.status } : {}),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.order.findMany({
                skip,
                take: limit,
                where,
                include: {
                    concert: { select: { name: true } },
                    tickets: { select: { id: true } },
                    payment_transactions: {
                        orderBy: { created_at: 'desc' },
                        select: { payment_method: true, status: true },
                    },
                },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.order.count({ where }),
        ]);

        const mapped = items.map((order: OrderListRow) => new OrderListItemDto({
            id: order.id,
            concert_name: order.concert.name,
            status: order.status,
            total_amount: this.toAmountString(order.total_amount),
            created_at: order.created_at,
            expires_at: order.expires_at,
            ticket_count: order.tickets.length,
            latest_payment_method: order.payment_transactions[0]?.payment_method ?? null,
            latest_payment_status: order.payment_transactions[0]?.status ?? null,
        }));

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
        return new OrderListResponseDto({
            data: mapped,
            meta: new PaginationMetaDto({
                totalItems: total,
                itemCount: mapped.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            }),
        });
    }

    async getAdminOrderHistory(query: AdminOrderListQueryDto): Promise<OrderListResponseDto> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = Math.max(0, (page - 1) * limit);

        const search = query.search?.trim();
        const searchIsUuid = search ? this.isUuid(search) : false;
        const where: Prisma.OrderWhereInput = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.user_id ? { user_id: query.user_id } : {}),
            ...(query.concert_id ? { concert_id: query.concert_id } : {}),
            ...(query.payment_method
                ? { payment_transactions: { some: { payment_method: query.payment_method } } }
                : {}),
            ...(search
                ? {
                    OR: [
                        ...(searchIsUuid ? [{ id: search }] : []),
                        { concert: { is: { name: { contains: search, mode: 'insensitive' } } } },
                        { user: { is: { email: { contains: search, mode: 'insensitive' } } } },
                        { user: { is: { full_name: { contains: search, mode: 'insensitive' } } } },
                    ],
                }
                : {}),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.order.findMany({
                skip,
                take: limit,
                where,
                include: {
                    concert: { select: { name: true } },
                    tickets: { select: { id: true } },
                    payment_transactions: {
                        orderBy: { created_at: 'desc' },
                        select: { payment_method: true, status: true },
                    },
                },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.order.count({ where }),
        ]);

        const mapped = items.map((order: OrderListRow) => new OrderListItemDto({
            id: order.id,
            concert_name: order.concert.name,
            status: order.status,
            total_amount: this.toAmountString(order.total_amount),
            created_at: order.created_at,
            expires_at: order.expires_at,
            ticket_count: order.tickets.length,
            latest_payment_method: order.payment_transactions[0]?.payment_method ?? null,
            latest_payment_status: order.payment_transactions[0]?.status ?? null,
        }));

        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
        return new OrderListResponseDto({
            data: mapped,
            meta: new PaginationMetaDto({
                totalItems: total,
                itemCount: mapped.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            }),
        });
    }

    async getOrderDetail(userId: string, orderId: string): Promise<OrderDetailDto> {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, user_id: userId },
            include: {
                concert: { select: { name: true } },
                tickets: {
                    include: { category: { select: { name: true, gate_number: true } } },
                },
                payment_transactions: {
                    orderBy: { created_at: 'desc' },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const row = order as unknown as OrderDetailRow;
        return new OrderDetailDto({
            id: row.id,
            concert_name: row.concert.name,
            status: row.status,
            total_amount: this.toAmountString(row.total_amount),
            created_at: row.created_at,
            expires_at: row.expires_at,
            ticket_count: row.tickets.length,
            ticket_metadata: row.ticket_metadata as Record<string, unknown> | null,
            tickets: row.tickets.map((ticket) => {
                const t = ticket as any;
                return new OrderTicketDto({
                    id: t.id,
                    category_id: t.category_id,
                    category_name: t.category?.name ?? null,
                    gate_number: t.category?.gate_number ?? null,
                    qr_code_hash: t.qr_code_hash,
                    is_scanned: t.is_scanned,
                    scanned_at: t.scanned_at,
                });
            }),
            payment_transactions: row.payment_transactions.map((transaction) => {
                const tx = transaction as any;
                return new OrderPaymentTransactionDto({
                    id: tx.id,
                    payment_method: tx.payment_method,
                    status: tx.status,
                    transaction_id_3rd_party: tx.transaction_id_3rd_party,
                    amount: this.toAmountString(tx.amount),
                    idempotency_key: tx.idempotency_key,
                    raw_response: tx.raw_response as Record<string, unknown> | null,
                    created_at: tx.created_at,
                    updated_at: tx.updated_at,
                });
            }),
        });
    }

    async getAdminOrderDetail(orderId: string): Promise<OrderDetailDto> {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId },
            include: {
                concert: { select: { name: true } },
                tickets: {
                    include: { category: { select: { name: true, gate_number: true } } },
                },
                payment_transactions: {
                    orderBy: { created_at: 'desc' },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const row = order as unknown as OrderDetailRow;
        return new OrderDetailDto({
            id: row.id,
            concert_name: row.concert.name,
            status: row.status,
            total_amount: this.toAmountString(row.total_amount),
            created_at: row.created_at,
            expires_at: row.expires_at,
            ticket_count: row.tickets.length,
            ticket_metadata: row.ticket_metadata as Record<string, unknown> | null,
            tickets: row.tickets.map((ticket) => {
                const t = ticket as any;
                return new OrderTicketDto({
                    id: t.id,
                    category_id: t.category_id,
                    category_name: t.category?.name ?? null,
                    gate_number: t.category?.gate_number ?? null,
                    qr_code_hash: t.qr_code_hash,
                    is_scanned: t.is_scanned,
                    scanned_at: t.scanned_at,
                });
            }),
            payment_transactions: row.payment_transactions.map((transaction) => {
                const tx = transaction as any;
                return new OrderPaymentTransactionDto({
                    id: tx.id,
                    payment_method: tx.payment_method,
                    status: tx.status,
                    transaction_id_3rd_party: tx.transaction_id_3rd_party,
                    amount: this.toAmountString(tx.amount),
                    idempotency_key: tx.idempotency_key,
                    raw_response: tx.raw_response as Record<string, unknown> | null,
                    created_at: tx.created_at,
                    updated_at: tx.updated_at,
                });
            }),
        });
    }

    private toAmountString(value: { toString(): string } | string): string {
        return typeof value === 'string' ? value : value.toString();
    }

    private isUuid(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }

    async cancelOrder(userId: string, orderId: string): Promise<OrderDetailDto> {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, user_id: userId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException(`Order cannot be cancelled in ${order.status} state`);
        }

        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
        });

        const metadata = order.ticket_metadata as Record<string, unknown> | null;
        if (metadata) {
            let breakdown: Array<{ category_id: string; quantity: number }> = [];
            if (Array.isArray(metadata.ticket_breakdown)) {
                breakdown = metadata.ticket_breakdown as any;
            } else if (typeof metadata.category_id === 'string' && typeof metadata.quantity === 'number') {
                breakdown = [{ category_id: metadata.category_id, quantity: metadata.quantity }];
            }

            for (const item of breakdown) {
                await this.ticketingService.rollbackCategoryInventory(
                    order.user_id,
                    item.category_id,
                    item.quantity
                );
            }
        }

        return this.getOrderDetail(userId, orderId);
    }
}