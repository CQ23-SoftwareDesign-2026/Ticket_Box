import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { PaymentMethod } from '../../dtos/payment-method.enum';
import { PaymentGatewayLookupResult, PaymentGatewaySessionInput, PaymentGatewaySessionResult, PaymentGatewayState, PaymentGatewayStrategy } from './payment-gateway.types';
import { PayOsStrategy } from './payos.strategy';

@Injectable()
export class PaymentGatewayClient {
    private readonly logger = new Logger(PaymentGatewayClient.name);
    private readonly breakers = new Map<PaymentMethod, CircuitBreaker<[PaymentGatewaySessionInput], PaymentGatewaySessionResult>>();
    private readonly states = new Map<PaymentMethod, PaymentGatewayState>();

    constructor(
        private readonly payosStrategy: PayOsStrategy,
    ) {}

    async createPaymentSession(
        paymentMethod: PaymentMethod,
        input: PaymentGatewaySessionInput,
    ): Promise<PaymentGatewaySessionResult> {
        const breaker = this.getBreaker(paymentMethod);
        return breaker.fire(input);
    }

    getCircuitState(paymentMethod: PaymentMethod): PaymentGatewayState {
        return this.states.get(paymentMethod) ?? 'CLOSED';
    }

    async getPaymentSession(
        paymentMethod: PaymentMethod,
        providerOrderCode: number,
    ): Promise<PaymentGatewayLookupResult> {
        return this.getStrategy(paymentMethod).getPaymentSession(providerOrderCode);
    }

    async cancelPaymentSession(
        paymentMethod: PaymentMethod,
        providerOrderCode: number,
        reason: string,
    ): Promise<PaymentGatewayLookupResult> {
        return this.getStrategy(paymentMethod).cancelPaymentSession(providerOrderCode, reason);
    }

    async verifyWebhookSignature(paymentMethod: PaymentMethod, payload: unknown): Promise<void> {
        await this.getStrategy(paymentMethod).verifyWebhookSignature(payload);
    }

    private getBreaker(paymentMethod: PaymentMethod): CircuitBreaker<[PaymentGatewaySessionInput], PaymentGatewaySessionResult> {
        const existing = this.breakers.get(paymentMethod);
        if (existing) {
            return existing;
        }

        const strategy = this.getStrategy(paymentMethod);
        const breaker = new CircuitBreaker(
            async (input: PaymentGatewaySessionInput) => strategy.createPaymentSession(input),
            {
                errorThresholdPercentage: 50,
                resetTimeout: 60_000,
                rollingCountTimeout: 10_000,
                rollingCountBuckets: 10,
                volumeThreshold: 4,
                timeout: Number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS ?? 3_000),
            },
        );

        this.states.set(paymentMethod, 'CLOSED');
        breaker.on('open', () => {
            this.states.set(paymentMethod, 'OPEN');
            this.logger.warn(`${paymentMethod} circuit breaker opened`);
        });
        breaker.on('halfOpen', () => {
            this.states.set(paymentMethod, 'HALF_OPEN');
            this.logger.warn(`${paymentMethod} circuit breaker half-open`);
        });
        breaker.on('close', () => {
            this.states.set(paymentMethod, 'CLOSED');
            this.logger.log(`${paymentMethod} circuit breaker closed`);
        });
        breaker.on('reject', () => {
            this.states.set(paymentMethod, 'OPEN');
        });
        breaker.on('failure', (error: unknown) => {
            this.logger.warn(`${paymentMethod} gateway failure`, error as Error);
        });

        this.breakers.set(paymentMethod, breaker);
        return breaker;
    }

    private getStrategy(paymentMethod: PaymentMethod): PaymentGatewayStrategy {
        switch (paymentMethod) {
            case PaymentMethod.PAYOS:
                return this.payosStrategy;
            default:
                throw new BadRequestException(`Unsupported payment method: ${paymentMethod}`);
        }
    }
}
