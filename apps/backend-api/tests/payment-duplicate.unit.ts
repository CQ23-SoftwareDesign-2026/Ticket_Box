import test from 'node:test';
import assert from 'node:assert/strict';
import { fn } from 'jest-mock';
import { PaymentService } from '../src/modules/payment/services/payment.service';
import { PaymentMethod } from '../src/modules/payment/dtos/payment-method.enum';

function createService() {
    const tx = {
        paymentTransaction: {
            update: fn().mockResolvedValue({}),
        },
        order: {
            update: fn().mockResolvedValue({}),
        },
        ticket: {
            create: fn().mockImplementation(async ({ data }: any) => ({
                id: `ticket-${tx.ticket.create.mock.calls.length}`,
                ...data,
            })),
            count: fn().mockResolvedValue(2),
        },
        ticketCategory: {
            findUnique: fn().mockResolvedValue({ total_quantity: 10, status: 'available' }),
            update: fn().mockResolvedValue({}),
        },
    };

    const prisma = {
        paymentTransaction: {
            findFirst: fn(),
            update: fn().mockResolvedValue({}),
        },
        $transaction: fn(async (callback: any) => callback(tx)),
    };

    const redisService = {
        getJson: fn(),
        setIfAbsentJson: fn(),
        setJson: fn(),
    };

    const paymentGatewayClient = {
        verifyWebhookSignature: fn().mockResolvedValue(undefined),
        getCircuitState: fn().mockReturnValue('CLOSED'),
        createPaymentSession: fn(),
    };

    const ticketingService = {
        rollbackCategoryInventory: fn(),
    };

    const notificationService = {
        sendTicketConfirmation: fn().mockResolvedValue(undefined),
    };

    const service = new PaymentService(
        prisma as any,
        redisService as any,
        paymentGatewayClient as any,
        ticketingService as any,
        notificationService as any,
    );

    return { service, prisma, tx, paymentGatewayClient, notificationService };
}

function buildTransaction(orderStatus: 'PENDING' | 'PAID', tickets: Array<{ id: string }> = []) {
    return {
        id: 'payment-transaction-1',
        order_id: 'order-1',
        payment_method: PaymentMethod.PAYOS,
        status: orderStatus === 'PAID' ? 'SUCCESS' : 'PENDING',
        transaction_id_3rd_party: 'payos-link-1',
        amount: 200000,
        raw_response: {},
        order: {
            id: 'order-1',
            status: orderStatus,
            ticket_metadata: {
                ticket_breakdown: [
                    { category_id: 'category-1', quantity: 2 },
                ],
            },
            concert: {
                ticket_categories: [
                    { id: 'category-1', name: 'SVIP' },
                ],
            },
            tickets,
        },
    };
}

function buildSuccessWebhook() {
    return {
        code: '00',
        desc: 'success',
        success: true,
        data: {
            paymentLinkId: 'payos-link-1',
            amount: 200000,
        },
        signature: 'valid-signature',
    };
}

test('payment webhook replay does not create duplicate tickets for an already paid order', async () => {
    const { service, prisma, tx } = createService();
    const paidTickets = [{ id: 'ticket-1' }, { id: 'ticket-2' }];

    prisma.paymentTransaction.findFirst
        .mockResolvedValueOnce(buildTransaction('PENDING'))
        .mockResolvedValueOnce(buildTransaction('PAID', paidTickets));

    const firstResult = await service.handleWebhook(buildSuccessWebhook() as any);
    const secondResult = await service.handleWebhook(buildSuccessWebhook() as any);

    assert.equal(firstResult.order_status, 'PAID');
    assert.equal(firstResult.ticket_count, 2);
    assert.equal(secondResult.order_status, 'PAID');
    assert.equal(secondResult.ticket_count, 2);

    assert.equal(tx.ticket.create.mock.calls.length, 2);
    assert.equal(tx.order.update.mock.calls.length, 1);
    assert.equal(prisma.paymentTransaction.update.mock.calls.length, 1);
});
