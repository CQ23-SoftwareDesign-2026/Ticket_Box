import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PayOS } from '@payos/node';
import { PaymentMethod } from '../../dtos/payment-method.enum';
import { PaymentGatewayLookupResult, PaymentGatewaySessionInput, PaymentGatewaySessionResult, PaymentGatewayStrategy } from './payment-gateway.types';

@Injectable()
export class PayOsStrategy implements PaymentGatewayStrategy {
    public readonly paymentMethod = PaymentMethod.PAYOS;
    private readonly logger = new Logger(PayOsStrategy.name);
    private payOS: PayOS;

    constructor() {
        const clientId = process.env.PAYOS_CLIENT_ID;
        const apiKey = process.env.PAYOS_API_KEY;
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

        if (!clientId || !apiKey || !checksumKey) {
            this.logger.warn('PayOS credentials are not set in environment variables');
            // Mock initialization to prevent crashes if env is not set up during build
            this.payOS = new PayOS({ clientId: 'mock-client-id', apiKey: 'mock-api-key', checksumKey: 'mock-checksum-key' });
        } else {
            this.payOS = new PayOS({ clientId, apiKey, checksumKey });
        }
    }

    async createPaymentSession(input: PaymentGatewaySessionInput): Promise<PaymentGatewaySessionResult> {
        try {
            // The database allocates this unique code before the gateway call.
            // It lets a late webhook identify a transaction even when the create
            // session response (and therefore paymentLinkId) was lost to timeout.
            const orderCode = input.providerOrderCode;
            
            const cancelUrl = input.returnUrl || `${process.env.FRONTEND_URL}/checkout/cancel`;
            const returnUrl = input.returnUrl || `${process.env.FRONTEND_URL}/checkout/success`;

            const requestData = {
                orderCode,
                amount: input.amount,
                description: `TICKET BOX ${orderCode}`,
                items: [
                    {
                        name: 'Ticket Order',
                        quantity: 1,
                        price: input.amount,
                    },
                ],
                cancelUrl,
                returnUrl,
                ...(input.expiredAt ? { expiredAt: input.expiredAt } : {}),
            };

            const paymentLinkRes = await this.payOS.paymentRequests.create(requestData);

            return {
                paymentMethod: this.paymentMethod,
                providerTransactionId: paymentLinkRes.paymentLinkId,
                checkoutUrl: paymentLinkRes.checkoutUrl,
                qrCode: paymentLinkRes.qrCode,
                accountName: paymentLinkRes.accountName,
                outcome: 'SUCCESS',
                raw: paymentLinkRes as unknown as Record<string, unknown>,
            };
        } catch (error) {
            this.logger.error('Failed to create PayOS payment session', error);
            throw new BadRequestException('Failed to initiate PayOS payment');
        }
    }

    async verifyWebhookSignature(payload: unknown): Promise<void> {
        try {
            // For PayOS, the signature is embedded inside the payload body (payload.signature)
            // webhooks.verify verifies the webhook data from the body
            const webhookData = await this.payOS.webhooks.verify(payload as any);
            if (!webhookData) {
                throw new BadRequestException('Invalid PayOS signature');
            }
        } catch (error) {
            this.logger.error('PayOS webhook signature verification failed', error);
            throw new BadRequestException('Invalid signature');
        }
    }

    async getPaymentSession(providerOrderCode: number): Promise<PaymentGatewayLookupResult> {
        const paymentLink = await this.payOS.paymentRequests.get(providerOrderCode, {
            timeout: Number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS ?? 3_000),
            maxRetries: 0,
        });

        return {
            paymentMethod: this.paymentMethod,
            providerTransactionId: paymentLink.id,
            providerOrderCode: paymentLink.orderCode,
            status: paymentLink.status,
            amountPaid: paymentLink.amountPaid,
            raw: paymentLink as unknown as Record<string, unknown>,
        };
    }

    async cancelPaymentSession(providerOrderCode: number, reason: string): Promise<PaymentGatewayLookupResult> {
        const paymentLink = await this.payOS.paymentRequests.cancel(providerOrderCode, reason, {
            timeout: Number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS ?? 3_000),
            maxRetries: 0,
        });

        return {
            paymentMethod: this.paymentMethod,
            providerTransactionId: paymentLink.id,
            providerOrderCode: paymentLink.orderCode,
            status: paymentLink.status,
            amountPaid: paymentLink.amountPaid,
            raw: paymentLink as unknown as Record<string, unknown>,
        };
    }

}
