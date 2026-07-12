import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma.service';
import { RedisService } from '../../../shared/redis';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { PaymentMethod } from '../dtos/payment-method.enum';
import { PaymentProcessResponseDto } from '../dtos/payment-process-response.dto';
import { PaymentWebhookRequestDto } from '../dtos/payment-webhook-request.dto';
import { PaymentWebhookResponseDto } from '../dtos/payment-webhook-response.dto';
import { PaymentTicketBreakdownDto } from '../dtos/payment-ticket-breakdown.dto';
import { PaymentGatewayClient } from './gateway/payment-gateway.client';
import { TicketingService } from '../../ticketing/services/ticketing.service';
import { NotificationService } from '../../notifications/notification.service';
import { ResolveRefundDto } from '../dtos/resolve-refund.dto';

type IdempotencyCacheEntry =
    | {
        state: 'IN_PROGRESS';
        order_id: string;
        payment_method: PaymentMethod;
        created_at: string;
    }
    | {
        state: 'COMPLETED';
        response: PaymentProcessResponseDto;
        completed_at: string;
    }
    | {
        state: 'FAILED';
        response: PaymentProcessResponseDto;
        error: string;
        failed_at: string;
    };

type CircuitState = {
    status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    openedAt: number | null;
    recentOutcomes: Array<{ at: number; ok: boolean }>;
    halfOpenProbes: number;
};

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly idempotencyTtlSeconds = 60 * 60 * 24;
    private readonly circuitOpenDurationMs = 60 * 1000;
    private readonly circuitWindowMs = 10 * 1000;
    private readonly circuitMinimumSamples = 4;
    private readonly circuitFailureThreshold = 0.5;
    private readonly circuitHalfOpenProbeLimit = 5;
    private readonly circuitStates = new Map<PaymentMethod, CircuitState>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
        private readonly paymentGatewayClient: PaymentGatewayClient,
        private readonly ticketingService: TicketingService,
        private readonly notificationService: NotificationService,
    ) { }

    async processPayment(
        userId: string,
        dto: CreatePaymentDto,
        idempotencyKey: string | undefined,
    ): Promise<PaymentProcessResponseDto> {
        const normalizedKey = idempotencyKey?.trim();
        if (!normalizedKey) {
            throw new BadRequestException('Idempotency-Key header is required');
        }

        const cacheKey = this.getIdempotencyCacheKey(normalizedKey);
        const cached = await this.redisService.getJson<IdempotencyCacheEntry | PaymentProcessResponseDto>(cacheKey);
        const cachedResponse = this.extractCompletedResponse(cached);
        if (cachedResponse) {
            return cachedResponse;
        }

        const reserved = await this.redisService.setIfAbsentJson(
            cacheKey,
            {
                state: 'IN_PROGRESS',
                order_id: dto.order_id,
                payment_method: dto.payment_method,
                created_at: new Date().toISOString(),
            } as unknown as IdempotencyCacheEntry,
            this.idempotencyTtlSeconds,
        );

        if (!reserved) {
            const existing = await this.findCachedOrPersistedProcessResult(normalizedKey, cacheKey);
            if (existing) {
                return existing;
            }

            throw new ConflictException('Payment request is already in progress');
        }

        const order = await this.prisma.order.findFirst({
            where: { id: dto.order_id, user_id: userId },
            include: {
                concert: {
                    include: { ticket_categories: true },
                },
                tickets: true,
                payment_transactions: {
                    orderBy: { created_at: 'desc' },
                },
            },
        });

        if (!order) {
            await this.persistIdempotencyFailure(cacheKey, normalizedKey, {
                message: 'Order not found',
            });
            throw new NotFoundException('Order not found');
        }

        if (order.status !== 'PENDING') {
            await this.persistIdempotencyFailure(cacheKey, normalizedKey, {
                message: `Order is already ${order.status.toLowerCase()}`,
            });
            throw new BadRequestException(`Order is already ${order.status.toLowerCase()}`);
        }

        // Check for an active transaction (not failed) before requesting a new session from the gateway
        const activeTransaction = order.payment_transactions.find(
            (tx) => tx.status !== 'FAILED' && tx.payment_method === dto.payment_method
        );

        if (activeTransaction) {
            const raw = activeTransaction.raw_response as any;
            const processData = raw?.process;

            if (processData?.checkoutUrl) {
                const response = this.mapProcessTransaction(
                    activeTransaction,
                    activeTransaction.idempotency_key,
                    this.paymentGatewayClient.getCircuitState(dto.payment_method),
                    processData.checkoutUrl,
                    processData.qrCode ?? null,
                    processData.accountName ?? null,
                    processData.status ?? 'PENDING',
                );
                await this.persistIdempotencyCompletion(cacheKey, response);
                return response;
            }

            // A gateway timeout is ambiguous: PayOS may have created the payment
            // link even though our process did not receive the response. Never
            // create another payment attempt for the same order until a webhook
            // or reconciliation process resolves this transaction.
            if (activeTransaction.status === 'UNKNOWN' || activeTransaction.status === 'INIT') {
                await this.persistIdempotencyFailure(cacheKey, normalizedKey, {
                    order_id: order.id,
                    payment_method: dto.payment_method,
                    message: 'Previous payment attempt is awaiting gateway confirmation',
                    circuit_breaker_state: this.paymentGatewayClient.getCircuitState(dto.payment_method),
                });
                throw new ConflictException('Payment status is being confirmed. Do not retry yet.');
            }
        }

        const existingTransaction = await this.prisma.paymentTransaction.findUnique({
            where: { idempotency_key: normalizedKey },
        });
        if (existingTransaction) {
            const mapped = this.mapProcessTransaction(
                existingTransaction,
                normalizedKey,
                this.paymentGatewayClient.getCircuitState(dto.payment_method),
                null,
                null,
                null,
                existingTransaction.status === 'UNKNOWN' ? 'UNKNOWN' : existingTransaction.status,
            );
            await this.persistIdempotencyCompletion(cacheKey, mapped);
            return mapped;
        }

        // Fast-fail before creating an audit row when PayOS is already known to
        // be unavailable. Opossum changes OPEN to HALF_OPEN after resetTimeout;
        // HALF_OPEN requests must continue so the breaker can probe recovery.
        const circuitState = this.paymentGatewayClient.getCircuitState(dto.payment_method);
        if (circuitState === 'OPEN') {
            await this.persistIdempotencyFailure(cacheKey, normalizedKey, {
                order_id: order.id,
                payment_method: dto.payment_method,
                message: `${dto.payment_method} payment gateway is temporarily unavailable`,
                circuit_breaker_state: circuitState,
            });
            throw new ServiceUnavailableException({
                message: `${dto.payment_method} payment gateway is temporarily unavailable`,
                circuit_breaker_state: circuitState,
            });
        }

        const paymentTransaction = await this.prisma.paymentTransaction.create({
            data: {
                order_id: dto.order_id,
                payment_method: dto.payment_method,
                amount: order.total_amount,
                status: 'INIT',
                idempotency_key: normalizedKey,
                raw_response: {
                    phase: 'PROCESS_REQUESTED',
                    order_id: dto.order_id,
                    payment_method: dto.payment_method,
                    requested_by_user_id: userId,
                } as Prisma.JsonObject,
            },
        });

        try {
            const gatewayResult = await this.paymentGatewayClient.createPaymentSession(dto.payment_method, {
                orderId: order.id,
                providerOrderCode: Number(paymentTransaction.provider_order_code),
                amount: Number(order.total_amount),
                userId,
                idempotencyKey: normalizedKey,
                expiredAt: Math.floor(order.expires_at.getTime() / 1000),
            });

            const payload = this.mapProcessTransaction(
                paymentTransaction,
                normalizedKey,
                this.paymentGatewayClient.getCircuitState(dto.payment_method),
                gatewayResult.checkoutUrl,
                gatewayResult.qrCode ?? null,
                gatewayResult.accountName ?? null,
                gatewayResult.outcome,
            );

            await this.prisma.paymentTransaction.update({
                where: { id: paymentTransaction.id },
                data: {
                    transaction_id_3rd_party: gatewayResult.providerTransactionId,
                    raw_response: {
                        process: gatewayResult.raw,
                        order_snapshot: {
                            order_id: order.id,
                            status: order.status,
                            current_ticket_count: order.tickets.length,
                        },
                    } as Prisma.JsonObject,
                },
            });

            await this.persistIdempotencyCompletion(cacheKey, payload);
            return payload;
        } catch (error) {
            const timedOut = this.isGatewayTimeout(error);
            const failed = await this.prisma.paymentTransaction.update({
                where: { id: paymentTransaction.id },
                data: {
                    status: timedOut ? 'UNKNOWN' : 'FAILED',
                    raw_response: {
                        phase: timedOut ? 'PROCESS_TIMEOUT_UNKNOWN' : 'PROCESS_FAILED',
                        message: error instanceof Error ? error.message : 'Unknown payment gateway error',
                        requires_reconciliation: timedOut,
                    } as Prisma.JsonObject,
                },
            });
            const response = this.mapProcessTransaction(
                failed,
                normalizedKey,
                this.paymentGatewayClient.getCircuitState(dto.payment_method),
                null,
                null,
                null,
                'ERROR',
            );
            await this.persistIdempotencyFailure(cacheKey, normalizedKey, {
                order_id: order.id,
                payment_method: dto.payment_method,
                message: error instanceof Error ? error.message : 'Unknown payment gateway error',
                response,
                circuit_breaker_state: this.paymentGatewayClient.getCircuitState(dto.payment_method),
            });
            throw new ServiceUnavailableException(response);
        }
    }

    async handleWebhook(
        dto: any,
    ): Promise<PaymentWebhookResponseDto> {
        // If the webhook call is empty, doesn't have a signature (e.g. ping/verify checks), return success immediately
        if (!dto || Object.keys(dto).length === 0 || !dto.signature) {
            return new PaymentWebhookResponseDto({
                order_status: 'PENDING',
                payment_status: 'SUCCESS',
                ticket_count: 0,
                message: 'Webhook confirmed',
                ticket_ids: [],
            });
        }

        // If this is a webhook confirmation request from PayOS, return success immediately
        if (dto.desc === 'confirm webhook' || dto.data?.description === 'confirm webhook' || !dto.data?.paymentLinkId) {
            return new PaymentWebhookResponseDto({
                order_status: 'PENDING',
                payment_status: 'SUCCESS',
                ticket_count: 0,
                message: 'Webhook confirmed',
                ticket_ids: [],
            });
        }

        await this.paymentGatewayClient.verifyWebhookSignature(PaymentMethod.PAYOS, dto);

        const providerOrderCode = dto.data.orderCode !== undefined
            ? BigInt(dto.data.orderCode)
            : undefined;
        const transaction = await this.prisma.paymentTransaction.findFirst({
            where: {
                payment_method: PaymentMethod.PAYOS,
                OR: [
                    { transaction_id_3rd_party: String(dto.data.paymentLinkId) },
                    ...(providerOrderCode !== undefined
                        ? [{ provider_order_code: providerOrderCode }]
                        : []),
                ],
            },
            include: {
                order: {
                    include: {
                        concert: {
                            include: { ticket_categories: true },
                        },
                        tickets: true,
                    },
                },
            },
        });

        if (!transaction) {
            this.logger.warn(`Webhook received for unknown transaction: ${dto.data.paymentLinkId}`);
            return new PaymentWebhookResponseDto({
                order_status: 'PENDING',
                payment_status: 'FAILED',
                ticket_count: 0,
                message: 'Transaction not found (ignored)',
                ticket_ids: [],
            });
        }

        if (dto.code !== '00') { // 00 means success in PayOS
            await this.prisma.$transaction(async (tx) => {
                await tx.paymentTransaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'FAILED',
                        raw_response: this.mergeTelemetry(transaction.raw_response, {
                            webhook: this.buildWebhookTelemetry(dto, dto.signature),
                        }) as Prisma.JsonObject,
                    },
                });
            });

            await this.handlePaymentFailed(transaction.order_id);

            return new PaymentWebhookResponseDto({
                order_status: 'CANCELLED',
                payment_status: 'FAILED',
                ticket_count: transaction.order.tickets.length,
                message: 'payment webhook processed',
                ticket_ids: transaction.order.tickets.map((ticket) => ticket.id),
            });
        }

        if (transaction.order.status === 'CANCELLED') {
            this.logger.warn(`Received successful payment webhook for already CANCELLED/EXPIRED order ${transaction.order_id}`);
            await this.prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'SUCCESS',
                    transaction_id_3rd_party: String(dto.data.paymentLinkId),
                    raw_response: this.mergeTelemetry(transaction.raw_response, {
                        webhook: this.buildWebhookTelemetry(dto, dto.signature),
                        warning: 'Paid after order expiration/cancellation',
                    }) as Prisma.JsonObject,
                },
            });

            return new PaymentWebhookResponseDto({
                order_status: 'CANCELLED',
                payment_status: 'SUCCESS',
                ticket_count: 0,
                message: 'Order was already cancelled or expired. Refund required.',
                ticket_ids: [],
            });
        }


        if (transaction.order.status === 'PAID' && transaction.order.tickets.length > 0) {
            await this.prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'SUCCESS',
                    transaction_id_3rd_party: String(dto.data.paymentLinkId),
                    raw_response: this.mergeTelemetry(transaction.raw_response, {
                        webhook: this.buildWebhookTelemetry(dto, dto.signature),
                    }) as Prisma.JsonObject,
                },
            });

            return new PaymentWebhookResponseDto({
                order_status: 'PAID',
                payment_status: 'SUCCESS',
                ticket_count: transaction.order.tickets.length,
                message: 'payment webhook processed',
                ticket_ids: transaction.order.tickets.map((ticket) => ticket.id),
            });
        }

        if (transaction.order.status === 'CANCELLED') {
            const breakdown = this.resolveTicketBreakdown(dto, transaction.order);
            const currentMetadata = (transaction.order as any).ticket_metadata || {};
            const refundMetadata = {
                ...currentMetadata,
                refund_required: true,
                refund_reason: 'PAID_AFTER_EXPIRATION',
                paid_amount: dto.data?.amount || Number(transaction.amount.toString()),
                ticket_breakdown: breakdown,
            };

            await this.prisma.$transaction(async (tx) => {
                await tx.paymentTransaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'SUCCESS',
                        transaction_id_3rd_party: String(dto.data.paymentLinkId),
                        raw_response: this.mergeTelemetry(transaction.raw_response, {
                            webhook: this.buildWebhookTelemetry(dto, dto.signature),
                        }) as Prisma.JsonObject,
                    },
                });

                await tx.order.update({
                    where: { id: transaction.order_id },
                    data: ({
                        status: 'CANCELLED',
                        ticket_metadata: refundMetadata,
                    } as any),
                });
            });

            this.logger.warn(`[Late Payment] Payment succeeded for already CANCELLED order ${transaction.order_id}. Refund required.`);

            return new PaymentWebhookResponseDto({
                order_status: 'CANCELLED',
                payment_status: 'SUCCESS',
                ticket_count: 0,
                message: 'Payment received for cancelled order. Ticket not created. Refund pending.',
                ticket_ids: [],
            });
        }

        const breakdown = this.resolveTicketBreakdown(dto, transaction.order);
        const ticketIds: string[] = [];

        await this.prisma.$transaction(async (tx) => {
            await tx.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'SUCCESS',
                    transaction_id_3rd_party: String(dto.data.paymentLinkId),
                    raw_response: this.mergeTelemetry(transaction.raw_response, {
                        webhook: this.buildWebhookTelemetry(dto, dto.signature),
                    }) as Prisma.JsonObject,
                },
            });

            await tx.order.update({
                where: { id: transaction.order_id },
                // cast to any because Prisma client types may be out-of-sync with schema migrations
                data: ({
                    status: 'PAID',
                    ticket_metadata: this.mergeTicketMetadata((transaction.order as any).ticket_metadata, breakdown),
                } as any),
            });

            for (const item of breakdown) {
                for (let index = 0; index < item.quantity; index += 1) {
                    const qrCodeHash = this.generateQrCodeHash(transaction.order_id, transaction.id, item.category_id, index);
                    const ticket = await tx.ticket.create({
                        data: {
                            order_id: transaction.order_id,
                            category_id: item.category_id,
                            qr_code_hash: qrCodeHash,
                        },
                    });
                    ticketIds.push(ticket.id);
                }
            }

            // Check if sold out and update TicketCategory status in DB
            for (const item of breakdown) {
                const category = await tx.ticketCategory.findUnique({
                    where: { id: item.category_id },
                    select: { total_quantity: true, status: true },
                });
                if (category) {
                    const soldCount = await tx.ticket.count({
                        where: { category_id: item.category_id },
                    });
                    if (soldCount >= category.total_quantity && category.status !== 'sold_out') {
                        await tx.ticketCategory.update({
                            where: { id: item.category_id },
                            data: { status: 'sold_out' },
                        });
                        this.logger.log(`[Sold Out] Category ${item.category_id} marked as sold_out in DB`);
                    }
                }
            }
        });

        // Payment is already committed; notification channel failures must not roll it back.
        void this.notificationService.sendTicketConfirmation(transaction.order_id).catch((error) => {
            this.logger.error(`Failed to dispatch ticket confirmation for order ${transaction.order_id}`, error);
        });

        return new PaymentWebhookResponseDto({
            order_status: 'PAID',
            payment_status: 'SUCCESS',
            ticket_count: ticketIds.length,
            message: 'payment webhook processed',
            ticket_ids: ticketIds,
        });
    }

    private async findCachedOrPersistedProcessResult(
        idempotencyKey: string,
        cacheKey: string,
    ): Promise<PaymentProcessResponseDto | null> {
        const cached = await this.redisService.getJson<IdempotencyCacheEntry | PaymentProcessResponseDto>(cacheKey);
        const cachedResponse = this.extractCompletedResponse(cached);
        if (cachedResponse) {
            return cachedResponse;
        }

        const existingTransaction = await this.prisma.paymentTransaction.findUnique({
            where: { idempotency_key: idempotencyKey },
        });
        if (!existingTransaction) {
            return null;
        }

        const result = this.mapProcessTransaction(
            existingTransaction,
            idempotencyKey,
            this.paymentGatewayClient.getCircuitState(existingTransaction.payment_method as PaymentMethod),
            null,
            null,
            null,
            existingTransaction.status === 'UNKNOWN' ? 'UNKNOWN' : existingTransaction.status,
        );
        await this.persistIdempotencyCompletion(cacheKey, result);
        return result;
    }

    private mapProcessTransaction(
        transaction: { id: string; order_id: string; payment_method: string; status: string; idempotency_key: string },
        idempotencyKey: string,
        circuitBreakerState: ReturnType<PaymentGatewayClient['getCircuitState']>,
        checkoutUrl: string | null,
        qrCode: string | null,
        accountName: string | null,
        gatewayStatus: string,
    ): PaymentProcessResponseDto {
        return new PaymentProcessResponseDto({
            payment_transaction_id: transaction.id,
            order_id: transaction.order_id,
            payment_method: transaction.payment_method,
            status: transaction.status,
            gateway_status: gatewayStatus,
            checkout_url: checkoutUrl,
            qr_code: qrCode,
            account_name: accountName,
            idempotency_key: idempotencyKey,
            circuit_breaker_state: circuitBreakerState,
        });
    }

    private extractCompletedResponse(value: IdempotencyCacheEntry | PaymentProcessResponseDto | null): PaymentProcessResponseDto | null {
        if (!value) {
            return null;
        }

        if ('payment_transaction_id' in value) {
            return new PaymentProcessResponseDto(value as PaymentProcessResponseDto);
        }

        if ('state' in value && value.state === 'COMPLETED' && value.response) {
            return new PaymentProcessResponseDto(value.response);
        }

        return null;
    }

    private resolveTicketBreakdown(
        dto: PaymentWebhookRequestDto,
        order: {
            ticket_metadata?: Prisma.JsonValue | null;
            concert: { ticket_categories: Array<{ id: string; name: string }> };
        },
    ): PaymentTicketBreakdownDto[] {
        const fromWebhook = dto.data?.ticket_breakdown ?? [];
        if (fromWebhook.length > 0) {
            return fromWebhook;
        }

        const storedBreakdown = this.extractTicketBreakdown(order.ticket_metadata ?? null);
        if (storedBreakdown.length > 0) {
            return storedBreakdown;
        }

        const defaultCategory = order.concert.ticket_categories[0];
        if (!defaultCategory) {
            throw new BadRequestException('Unable to determine ticket category for paid order');
        }

        return [{ category_id: defaultCategory.id, quantity: 1 }];
    }

    private extractTicketBreakdown(value: Prisma.JsonValue | null): PaymentTicketBreakdownDto[] {
        if (!value) return [];
        let record: Record<string, unknown> | null = null;
        if (typeof value === 'string') {
            try {
                record = JSON.parse(value);
            } catch {
                return [];
            }
        } else if (typeof value === 'object' && !Array.isArray(value)) {
            record = value as Record<string, unknown>;
        }

        if (!record) {
            return [];
        }

        if (typeof record.category_id === 'string' && typeof record.quantity === 'number' && record.quantity > 0) {
            return [{ category_id: record.category_id, quantity: record.quantity }];
        }

        const candidate = record.ticket_breakdown;
        if (!Array.isArray(candidate)) {
            return [];
        }

        return candidate
            .map((item) => {
                if (!item || typeof item !== 'object' || Array.isArray(item)) {
                    return null;
                }

                const categoryId = (item as Record<string, unknown>).category_id;
                const quantity = (item as Record<string, unknown>).quantity;
                if (typeof categoryId !== 'string' || typeof quantity !== 'number' || quantity < 1) {
                    return null;
                }

                return { category_id: categoryId, quantity };
            })
            .filter((item): item is PaymentTicketBreakdownDto => item !== null);
    }

    private mergeTicketMetadata(
        ticketMetadata: Prisma.JsonValue | null,
        breakdown: PaymentTicketBreakdownDto[],
    ): Prisma.JsonObject {
        const base = ticketMetadata && typeof ticketMetadata === 'object' && !Array.isArray(ticketMetadata)
            ? { ...(ticketMetadata as Prisma.JsonObject) }
            : {};

        return {
            ...base,
            ticket_breakdown: breakdown as unknown as Prisma.JsonArray,
            updated_at: new Date().toISOString(),
        };
    }

    private mergeTelemetry(existing: Prisma.JsonValue | null, payload: Record<string, unknown>): Prisma.JsonObject {
        const base = existing && typeof existing === 'object' && !Array.isArray(existing)
            ? { ...(existing as Prisma.JsonObject) }
            : {};

        return ({
            ...base,
            ...payload,
        } as Prisma.JsonObject);
    }

    private buildWebhookTelemetry(dto: PaymentWebhookRequestDto, signature: string | undefined): Record<string, unknown> {
        return {
            ...dto,
            signature_verified: true,
            signature: signature ?? null,
            received_at: new Date().toISOString(),
        };
    }



    private async persistIdempotencyCompletion(
        cacheKey: string,
        response: PaymentProcessResponseDto,
    ): Promise<void> {
        await this.redisService.setJson(cacheKey, {
            state: 'COMPLETED',
            response,
            completed_at: new Date().toISOString(),
        } satisfies IdempotencyCacheEntry, this.idempotencyTtlSeconds);
    }

    private stableStringify(value: unknown): string {
        if (value === null || typeof value !== 'object') {
            return JSON.stringify(value);
        }

        if (Array.isArray(value)) {
            return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
        }

        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, entry]) => `${JSON.stringify(key)}:${this.stableStringify(entry)}`);

        return `{${entries.join(',')}}`;
    }

    private generateQrCodeHash(orderId: string, transactionId: string, categoryId: string, index: number): string {
        return createHash('sha256')
            .update(`${orderId}:${transactionId}:${categoryId}:${index}:${randomUUID()}`)
            .digest('hex');
    }

    private getIdempotencyCacheKey(idempotencyKey: string): string {
        return `payments:idempotency:${idempotencyKey}`;
    }

    private isGatewayTimeout(error: unknown): boolean {
        if (!(error instanceof Error)) return false;
        const candidate = error as Error & { code?: string };
        return candidate.code === 'ETIMEDOUT'
            || candidate.name === 'TimeoutError'
            || /timed?\s*out|timeout/i.test(candidate.message);
    }

    private getCircuitState(paymentMethod: PaymentMethod): CircuitState {
        const current = this.circuitStates.get(paymentMethod);
        if (current) {
            return current;
        }

        const initial: CircuitState = {
            status: 'CLOSED',
            openedAt: null,
            recentOutcomes: [],
            halfOpenProbes: 0,
        };
        this.circuitStates.set(paymentMethod, initial);
        return initial;
    }

    private assertCircuitAvailable(paymentMethod: PaymentMethod): void {
        const state = this.getCircuitState(paymentMethod);
        if (state.status === 'OPEN') {
            if (state.openedAt !== null && Date.now() - state.openedAt >= this.circuitOpenDurationMs) {
                state.status = 'HALF_OPEN';
                state.halfOpenProbes = 0;
                return;
            }

            throw new ServiceUnavailableException(`${paymentMethod} circuit breaker is open`);
        }

        if (state.status === 'HALF_OPEN' && state.halfOpenProbes >= this.circuitHalfOpenProbeLimit) {
            throw new ServiceUnavailableException(`${paymentMethod} circuit breaker is half-open and probing`);
        }
    }

    private recordCircuitOutcome(paymentMethod: PaymentMethod, ok: boolean): void {
        const state = this.getCircuitState(paymentMethod);
        const now = Date.now();
        state.recentOutcomes = state.recentOutcomes.filter((entry) => now - entry.at <= this.circuitWindowMs);
        state.recentOutcomes.push({ at: now, ok });

        if (state.status === 'HALF_OPEN') {
            state.halfOpenProbes += 1;
            if (ok && state.halfOpenProbes >= this.circuitHalfOpenProbeLimit) {
                state.status = 'CLOSED';
                state.openedAt = null;
                state.halfOpenProbes = 0;
                state.recentOutcomes = [];
            }
            if (!ok) {
                state.status = 'OPEN';
                state.openedAt = now;
                state.halfOpenProbes = 0;
            }
            return;
        }

        if (state.recentOutcomes.length < this.circuitMinimumSamples) {
            return;
        }

        const failures = state.recentOutcomes.filter((entry) => !entry.ok).length;
        const failureRate = failures / state.recentOutcomes.length;
        if (failureRate >= this.circuitFailureThreshold) {
            state.status = 'OPEN';
            state.openedAt = now;
            state.halfOpenProbes = 0;
        }
    }

    private async persistIdempotencyFailure(
        cacheKey: string,
        idempotencyKey: string,
        payload: Record<string, unknown>,
    ): Promise<void> {
        const response = new PaymentProcessResponseDto({
            payment_transaction_id: idempotencyKey,
            order_id: payload.order_id as string ?? '',
            payment_method: payload.payment_method as string ?? '',
            status: 'FAILED',
            gateway_status: 'FAILED',
            checkout_url: null,
            idempotency_key: idempotencyKey,
            circuit_breaker_state: String(payload.circuit_breaker_state ?? 'CLOSED'),
        });
        await this.redisService.setJson(cacheKey, {
            state: 'FAILED',
            response,
            error: String(payload.message ?? 'failed'),
            failed_at: new Date().toISOString(),
        } satisfies IdempotencyCacheEntry, this.idempotencyTtlSeconds);
    }

    public async handlePaymentFailed(orderId: string): Promise<void> {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order || order.status !== 'PENDING') return;

        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
        });

        const breakdown = this.extractTicketBreakdown(order.ticket_metadata ?? null);
        for (const item of breakdown) {
            await this.ticketingService.rollbackCategoryInventory(
                order.user_id,
                item.category_id,
                item.quantity
            );
        }
    }

    public async resolveRefund(
        transactionId: string,
        adminUserId: string,
        dto: ResolveRefundDto,
    ) {
        const transaction = await this.prisma.paymentTransaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        if (transaction.status === 'REFUNDED') {
            throw new BadRequestException('Transaction is already refunded');
        }

        const existingRaw = (transaction.raw_response as Prisma.JsonObject) || {};
        const updatedRaw = {
            ...existingRaw,
            refund_info: {
                refunded_by: adminUserId,
                refunded_at: new Date().toISOString(),
                refund_tx_id: dto.refund_tx_id || null,
                refund_note: dto.refund_note || null,
            },
        };

        return this.prisma.paymentTransaction.update({
            where: { id: transactionId },
            data: {
                status: 'REFUNDED',
                raw_response: updatedRaw as Prisma.JsonObject,
            },
        });
    }
}
