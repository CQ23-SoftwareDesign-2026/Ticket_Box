import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma.service';
import { TicketingService } from './ticketing.service';

type ReservationItem = {
    category_id: string;
    quantity: number;
};

@Injectable()
export class PendingOrderCleanupService {
    private readonly logger = new Logger(PendingOrderCleanupService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly ticketingService: TicketingService,
    ) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async cancelExpiredPendingOrders(): Promise<void> {
        const expiredOrders = await this.prisma.order.findMany({
            where: {
                status: 'PENDING',
                expires_at: {
                    lt: new Date(),
                },
            },
            select: {
                id: true,
                user_id: true,
                ticket_metadata: true,
            },
            take: Number(process.env.EXPIRED_ORDER_CLEANUP_BATCH_SIZE ?? 100),
        });

        if (expiredOrders.length === 0) {
            return;
        }

        for (const order of expiredOrders) {
            const updated = await this.prisma.order.updateMany({
                where: {
                    id: order.id,
                    status: 'PENDING',
                },
                data: {
                    status: 'CANCELLED',
                },
            });

            if (updated.count === 0) {
                continue;
            }

            const items = this.extractReservationItems(order.ticket_metadata);
            if (items.length > 0) {
                await this.ticketingService.rollbackCategoryInventory(order.user_id, items);
            }

            this.logger.log(`[ExpiredOrderCleanup] Cancelled expired order ${order.id} and restored ${items.length} reservation item(s)`);
        }
    }

    private extractReservationItems(rawMetadata: unknown): ReservationItem[] {
        if (!rawMetadata) {
            return [];
        }

        let metadata: any = rawMetadata;
        if (typeof rawMetadata === 'string') {
            try {
                metadata = JSON.parse(rawMetadata);
            } catch {
                return [];
            }
        }

        if (metadata.category_id && metadata.quantity) {
            return [{
                category_id: metadata.category_id,
                quantity: metadata.quantity,
            }];
        }

        if (!Array.isArray(metadata.ticket_breakdown)) {
            return [];
        }

        return metadata.ticket_breakdown
            .filter((item: any) => typeof item?.category_id === 'string' && Number.isInteger(item?.quantity) && item.quantity > 0)
            .map((item: any) => ({
                category_id: item.category_id,
                quantity: item.quantity,
            }));
    }
}
