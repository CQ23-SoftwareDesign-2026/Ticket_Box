import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { RedisModule } from '../../shared/redis/redis.module';
import { PaymentController } from './controllers/payment.controller';
import { OrdersController } from './controllers/orders.controller';
import { PaymentService } from './services/payment.service';
import { OrdersService } from './services/orders.service';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { PaymentGatewayClient } from './services/gateway/payment-gateway.client';
import { PayOsStrategy } from './services/gateway/payos.strategy';
import { PaymentIdempotencyInterceptor } from './interceptors/payment-idempotency.interceptor';
import { TicketingModule } from '../ticketing/ticketing.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [RedisModule, TicketingModule, NotificationModule],
    providers: [
        PrismaService,
        PaymentService,
        OrdersService,
        RolesGuard,
        PaymentGatewayClient,
        PayOsStrategy,
        PaymentIdempotencyInterceptor,
    ],
    controllers: [PaymentController, OrdersController],
    exports: [PaymentService, OrdersService],
})
export class PaymentModule { }