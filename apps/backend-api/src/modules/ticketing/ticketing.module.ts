import { Module } from '@nestjs/common';
import { RedisModule } from '../../shared/redis/redis.module';
import { PrismaService } from '../../shared/prisma.service';
import { TicketingController } from './controllers/ticketing.controller';
import { TicketingService } from './services/ticketing.service';
import { PendingOrderCleanupService } from './services/pending-order-cleanup.service';
import { TicketReserveRateLimitGuard } from './guards/ticket-reserve-rate-limit.guard';
import { OrderCreateConsumer, OrderExpiredConsumer } from './consumers/order.consumer';

@Module({
    imports: [RedisModule],
    controllers: [TicketingController],
    providers: [
        TicketingService,
        PrismaService,
        OrderCreateConsumer,
        OrderExpiredConsumer,
        PendingOrderCleanupService,
        TicketReserveRateLimitGuard,
    ],
    exports: [TicketingService],
})
export class TicketingModule { }
