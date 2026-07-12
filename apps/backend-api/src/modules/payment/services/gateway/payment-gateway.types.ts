import { PaymentMethod } from '../../dtos/payment-method.enum';

export type PaymentGatewayState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type PaymentGatewayOutcome = 'SUCCESS' | 'ERROR' | 'TIMEOUT';

export type PaymentGatewaySessionInput = {
    orderId: string;
    providerOrderCode: number;
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

export type PaymentGatewayLookupStatus =
    | 'PENDING'
    | 'PROCESSING'
    | 'UNDERPAID'
    | 'PAID'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'FAILED';

export type PaymentGatewayLookupResult = {
    paymentMethod: PaymentMethod;
    providerTransactionId: string;
    providerOrderCode: number;
    status: PaymentGatewayLookupStatus;
    amountPaid: number;
    raw: Record<string, unknown>;
};

export interface PaymentGatewayStrategy {
    readonly paymentMethod: PaymentMethod;

    createPaymentSession(input: PaymentGatewaySessionInput): Promise<PaymentGatewaySessionResult>;

    getPaymentSession(providerOrderCode: number): Promise<PaymentGatewayLookupResult>;

    cancelPaymentSession(providerOrderCode: number, reason: string): Promise<PaymentGatewayLookupResult>;

    verifyWebhookSignature(payload: unknown): Promise<void> | void;
}
