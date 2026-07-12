import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma.service';
import {
    RevenueByConcertQueryDto,
    RevenueRangeQueryDto,
    RevenueTrendQueryDto,
} from '../dtos/revenue-query.dto';

type MoneyLike = { toString(): string } | string | number | null | undefined;

type RevenueOrderRow = {
    total_amount: MoneyLike;
    created_at: Date;
    tickets: Array<{ id: string }>;
};

type RevenueConcertRow = {
    id: string;
    name: string;
    status: string;
    start_time: Date;
    poster_url: string | null;
    location: string | null;
    orders: Array<{
        total_amount: MoneyLike;
        tickets: Array<{ id: string }>;
    }>;
};

type RevenueConcertDetailRow = {
    id: string;
    name: string;
    status: string;
    start_time: Date;
    ticket_categories: Array<{
        id: string;
        name: string;
        price: MoneyLike;
        total_quantity: number;
        gate_number: number | null;
        tickets: Array<{ id: string }>;
    }>;
};

@Injectable()
export class AdminRevenueService {
    constructor(private readonly prisma: PrismaService) { }

    async getTrend(query: RevenueTrendQueryDto) {
        const to = query.to ? new Date(query.to) : new Date();
        const from = query.from ? new Date(query.from) : this.daysBefore(to, 30);
        const groupBy = query.group_by ?? 'day';

        const orders = await this.prisma.order.findMany({
            where: {
                status: 'PAID',
                created_at: {
                    gte: from,
                    lte: to,
                },
            },
            select: {
                total_amount: true,
                created_at: true,
                tickets: {
                    select: { id: true },
                },
            },
            orderBy: { created_at: 'asc' },
        });

        const buckets = new Map<string, {
            period: string;
            revenue: number;
            paid_orders: number;
            tickets_sold: number;
        }>();

        for (const order of orders as RevenueOrderRow[]) {
            const period = this.formatPeriod(order.created_at, groupBy);
            const current = buckets.get(period) ?? {
                period,
                revenue: 0,
                paid_orders: 0,
                tickets_sold: 0,
            };

            current.revenue += this.toNumber(order.total_amount);
            current.paid_orders += 1;
            current.tickets_sold += order.tickets.length;
            buckets.set(period, current);
        }

        return {
            group_by: groupBy,
            from,
            to,
            items: Array.from(buckets.values()).sort((left, right) => left.period.localeCompare(right.period)),
        };
    }

    async getByConcert(query: RevenueByConcertQueryDto) {
        const createdAt = this.getDateFilter(query);
        const limit = query.limit ?? 50;

        const concerts = await this.prisma.concert.findMany({
            where: query.status ? { status: query.status } : {},
            select: {
                id: true,
                name: true,
                status: true,
                start_time: true,
                poster_url: true,
                location: true,
                orders: {
                    where: {
                        status: 'PAID',
                        ...(createdAt ? { created_at: createdAt } : {}),
                    },
                    select: {
                        total_amount: true,
                        tickets: {
                            select: { id: true },
                        },
                    },
                },
            },
            orderBy: { start_time: 'desc' },
            take: limit,
        });

        return {
            items: (concerts as RevenueConcertRow[]).map((concert) => ({
                concert_id: concert.id,
                concert_name: concert.name,
                status: concert.status,
                start_time: concert.start_time,
                poster_url: concert.poster_url,
                location: concert.location,
                revenue: this.sumRevenue(concert.orders),
                paid_orders: concert.orders.length,
                tickets_sold: this.sumTickets(concert.orders),
            })),
        };
    }

    async getConcertDetail(concertId: string, query: RevenueRangeQueryDto) {
        const createdAt = this.getDateFilter(query);

        const concert = await this.prisma.concert.findUnique({
            where: { id: concertId },
            select: {
                id: true,
                name: true,
                status: true,
                start_time: true,
                poster_url: true,
                location: true,
                ticket_categories: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        total_quantity: true,
                        gate_number: true,
                        tickets: {
                            where: {
                                order: {
                                    status: 'PAID',
                                    ...(createdAt ? { created_at: createdAt } : {}),
                                },
                            },
                            select: { id: true },
                        },
                    },
                    orderBy: { name: 'asc' },
                },
            },
        });

        if (!concert) {
            throw new NotFoundException('Concert not found');
        }

        const orders = await this.prisma.order.findMany({
            where: {
                concert_id: concertId,
                status: 'PAID',
                ...(createdAt ? { created_at: createdAt } : {}),
            },
            select: {
                total_amount: true,
                tickets: {
                    select: { id: true },
                },
            },
        });

        const detail = concert as RevenueConcertDetailRow;

        return {
            concert: {
                id: detail.id,
                name: detail.name,
                status: detail.status,
                start_time: detail.start_time,
                poster_url: (concert as any).poster_url ?? null,
                location: (concert as any).location ?? null,
            },
            total_revenue: this.sumRevenue(orders),
            paid_orders: orders.length,
            tickets_sold: this.sumTickets(orders),
            ticket_tiers: detail.ticket_categories.map((category) => {
                const price = this.toNumber(category.price);
                const ticketsSold = category.tickets.length;

                return {
                    category_id: category.id,
                    name: category.name,
                    price,
                    total_quantity: category.total_quantity,
                    tickets_sold: ticketsSold,
                    remaining_quantity: Math.max(category.total_quantity - ticketsSold, 0),
                    revenue: price * ticketsSold,
                    gate_number: category.gate_number,
                };
            }),
        };
    }

    private getDateFilter(query: RevenueRangeQueryDto): Prisma.DateTimeFilter | undefined {
        const filter: Prisma.DateTimeFilter = {};

        if (query.from) {
            filter.gte = new Date(query.from);
        }

        if (query.to) {
            filter.lte = new Date(query.to);
        }

        return Object.keys(filter).length > 0 ? filter : undefined;
    }

    private sumRevenue(orders: Array<{ total_amount: MoneyLike }>): number {
        return orders.reduce((total, order) => total + this.toNumber(order.total_amount), 0);
    }

    private sumTickets(orders: Array<{ tickets: Array<{ id: string }> }>): number {
        return orders.reduce((total, order) => total + order.tickets.length, 0);
    }

    private toNumber(value: MoneyLike): number {
        if (value === null || value === undefined) {
            return 0;
        }

        if (typeof value === 'number') {
            return value;
        }

        return Number(value.toString());
    }

    private daysBefore(date: Date, days: number): Date {
        return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
    }

    private formatPeriod(date: Date, groupBy: 'day' | 'week' | 'month'): string {
        if (groupBy === 'month') {
            return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        }

        if (groupBy === 'week') {
            const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
            const day = weekStart.getUTCDay();
            const mondayOffset = day === 0 ? -6 : 1 - day;
            weekStart.setUTCDate(weekStart.getUTCDate() + mondayOffset);
            return this.formatDate(weekStart);
        }

        return this.formatDate(date);
    }

    private formatDate(date: Date): string {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    }
}
