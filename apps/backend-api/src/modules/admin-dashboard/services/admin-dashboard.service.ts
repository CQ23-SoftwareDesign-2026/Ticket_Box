import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { RecentOrdersQueryDto, RevenueQueryDto } from '../dtos/dashboard-query.dto';

type MoneyLike = { toString(): string } | string | number | null | undefined;

type RevenueOrderRow = {
    total_amount: MoneyLike;
    created_at: Date;
    tickets: Array<{ id: string }>;
};

type RecentOrderRow = {
    id: string;
    status: string;
    total_amount: MoneyLike;
    created_at: Date;
    user: {
        full_name: string;
        email: string;
    };
    concert: {
        name: string;
    };
    tickets: Array<{ id: string }>;
};

@Injectable()
export class AdminDashboardService {
    constructor(private readonly prisma: PrismaService) { }

    async getSummary() {
        const [revenueAggregate, ticketsSold, totalUsers, publishedEvents] = await this.prisma.$transaction([
            this.prisma.order.aggregate({
                where: { status: 'PAID' },
                _sum: { total_amount: true },
            }),
            this.prisma.ticket.count({
                where: {
                    order: {
                        status: 'PAID',
                    },
                },
            }),
            this.prisma.user.count(),
            this.prisma.concert.count({
                where: { status: 'PUBLISHED' },
            }),
        ]);

        return {
            total_revenue: this.toNumber(revenueAggregate._sum.total_amount),
            tickets_sold: ticketsSold,
            total_users: totalUsers,
            published_events: publishedEvents,
        };
    }

    async getRevenue(query: RevenueQueryDto) {
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

        return Array.from(buckets.values()).sort((left, right) => left.period.localeCompare(right.period));
    }

    async getRecentOrders(query: RecentOrdersQueryDto) {
        const limit = query.limit ?? 5;

        const orders = await this.prisma.order.findMany({
            take: limit,
            orderBy: { created_at: 'desc' },
            include: {
                user: {
                    select: {
                        full_name: true,
                        email: true,
                    },
                },
                concert: {
                    select: {
                        name: true,
                    },
                },
                tickets: {
                    select: { id: true },
                },
            },
        });

        return (orders as RecentOrderRow[]).map((order) => ({
            order_id: order.id,
            customer_name: order.user.full_name,
            customer_email: order.user.email,
            concert_name: order.concert.name,
            status: order.status,
            total_amount: this.toNumber(order.total_amount),
            ticket_count: order.tickets.length,
            created_at: order.created_at,
        }));
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
