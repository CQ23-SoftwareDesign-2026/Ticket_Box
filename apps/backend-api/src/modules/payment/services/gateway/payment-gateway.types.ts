import { PaymentMethod } from '../../dtos/payment-method.enum';

export type PaymentGatewayState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type PaymentGatewayOutcome = 'SUCCESS' | 'ERROR' | 'TIMEOUT';

export type PaymentGatewaySessionInput = {
    orderId: string;
    amount: number;
    userId: string;
    idempotencyKey: string;
    returnUrl?: string;
    webhookUrl?: string;
    expiredAt?: number;
};

export type PaymentGatewaySessionResult = {
    paymentMethod: PaymentMethod;
    providerTransactionId: string;
    checkoutUrl: string;
    qrCode?: string;
    accountName?: string;
    outcome: PaymentGatewayOutcome;
    raw: Record<string, unknown>;
};

export interface PaymentGatewayStrategy {
    readonly paymentMethod: PaymentMethod;

    createPaymentSession(input: PaymentGatewaySessionInput): Promise<PaymentGatewaySessionResult>;

    verifyWebhookSignature(payload: unknown): Promise<void> | void;
}