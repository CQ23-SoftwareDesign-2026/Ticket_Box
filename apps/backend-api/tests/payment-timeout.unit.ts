import test from 'node:test';
import assert from 'node:assert/strict';
import { fn } from 'jest-mock';
import { PaymentService } from '../src/modules/payment/services/payment.service';
import { PaymentMethod } from '../src/modules/payment/dtos/payment-method.enum';

test('a timed-out payment remains UNKNOWN and a new key cannot create a second session', async () => {
    const cache = new Map<string, unknown>();
    const transactions: any[] = [];
    const order = {
        id: 'order-1',
        status: 'PENDING',
        total_amount: 200000,
        expires_at: new Date(Date.now() + 300_000),
        tickets: [],
        concert: { ticket_categories: [] },
        payment_transactions: transactions,
    };

    const prisma = {
        order: { findFirst: fn().mockImplementation(async () => order) },
        paymentTransaction: {
            findUnique: fn().mockImplementation(async ({ where }: any) =>
                transactions.find((tx) => tx.idempotency_key === where.idempotency_key) ?? null),
            create: fn().mockImplementation(async ({ data }: any) => {
                const tx = { id: 'tx-1', provider_order_code: 100001n, ...data };
                transactions.push(tx);
                return tx;
            }),
            update: fn().mockImplementation(async ({ where, data }: any) => {
                const tx = transactions.find((item) => item.id === where.id)!;
                Object.assign(tx, data);
                return tx;
            }),
        },
    };
    const redis = {
        getJson: fn().mockImplementation(async (key: string) => cache.get(key) ?? null),
        setIfAbsentJson: fn().mockImplementation(async (key: string, value: unknown) => {
            if (cache.has(key)) return false;
            cache.set(key, value);
            return true;
        }),
        setJson: fn().mockImplementation(async (key: string, value: unknown) => {
            cache.set(key, value);
            return true;
        }),
    };
    const timeout = Object.assign(new Error('Timed out after 3000ms'), { name: 'TimeoutError' });
    const gateway = {
        createPaymentSession: fn().mockRejectedValue(timeout),
        getPaymentSession: fn().mockRejectedValue(timeout),
        getCircuitState: fn()
            .mockReturnValueOnce('CLOSED')
            .mockReturnValue('OPEN'),
        verifyWebhookSignature: fn(),
    };
    const service = new PaymentService(
        prisma as any,
        redis as any,
        gateway as any,
        { rollbackCategoryInventory: fn() } as any,
        { sendTicketConfirmation: fn() } as any,
    );

    await assert.rejects(
        service.processPayment('user-1', { order_id: order.id, payment_method: PaymentMethod.PAYOS }, '11111111-1111-4111-8111-111111111111'),
    );
    assert.equal(transactions[0].status, 'UNKNOWN');
    assert.equal(transactions[0].raw_response.requires_reconciliation, true);

    await assert.rejects(
        service.processPayment('user-1', { order_id: order.id, payment_method: PaymentMethod.PAYOS }, '22222222-2222-4222-8222-222222222222'),
        /payment gateway is temporarily unavailable/,
    );
    assert.equal(gateway.createPaymentSession.mock.calls.length, 1);
    assert.equal(transactions.length, 1);
});

test('an UNKNOWN pending transaction is cancelled and replaced with a fresh PayOS QR session', async () => {
    const unknownTransaction = {
        id: 'tx-unknown',
        order_id: 'order-1',
        payment_method: PaymentMethod.PAYOS,
        provider_order_code: 139134n,
        transaction_id_3rd_party: null,
        status: 'UNKNOWN',
        idempotency_key: '11111111-1111-4111-8111-111111111111',
        raw_response: {
            phase: 'PROCESS_TIMEOUT_UNKNOWN',
            requires_reconciliation: true,
        },
    };
    const order = {
        id: 'order-1',
        status: 'PENDING',
        total_amount: 200000,
        expires_at: new Date(Date.now() + 300_000),
        tickets: [],
        concert: { ticket_categories: [] },
        payment_transactions: [unknownTransaction],
    };
    const cache = new Map<string, unknown>();
    const update = fn().mockImplementation(async ({ data }: any) => ({
        ...unknownTransaction,
        ...data,
    }));
    const create = fn().mockResolvedValue({
        id: 'tx-replacement',
        order_id: order.id,
        payment_method: PaymentMethod.PAYOS,
        provider_order_code: 139135n,
        status: 'INIT',
        idempotency_key: '22222222-2222-4222-8222-222222222222',
    });
    const prisma = {
        order: { findFirst: fn().mockResolvedValue(order) },
        paymentTransaction: { findUnique: fn().mockResolvedValue(null), create, update },
    };
    const redis = {
        getJson: fn().mockImplementation(async (key: string) => cache.get(key) ?? null),
        setIfAbsentJson: fn().mockImplementation(async (key: string, value: unknown) => {
            if (cache.has(key)) return false;
            cache.set(key, value);
            return true;
        }),
        setJson: fn().mockImplementation(async (key: string, value: unknown) => {
            cache.set(key, value);
            return true;
        }),
    };
    const gateway = {
        getPaymentSession: fn().mockResolvedValue({
            paymentMethod: PaymentMethod.PAYOS,
            providerTransactionId: '554c0aeaf819472888692f2a5aa8cf88',
            providerOrderCode: 139134,
            status: 'PENDING',
            amountPaid: 0,
            raw: { id: '554c0aeaf819472888692f2a5aa8cf88', orderCode: 139134, status: 'PENDING' },
        }),
        cancelPaymentSession: fn().mockResolvedValue({
            paymentMethod: PaymentMethod.PAYOS,
            providerTransactionId: '554c0aeaf819472888692f2a5aa8cf88',
            providerOrderCode: 139134,
            status: 'CANCELLED',
            amountPaid: 0,
            raw: { id: '554c0aeaf819472888692f2a5aa8cf88', orderCode: 139134, status: 'CANCELLED' },
        }),
        createPaymentSession: fn().mockResolvedValue({
            paymentMethod: PaymentMethod.PAYOS,
            providerTransactionId: 'new-payment-link-id',
            checkoutUrl: 'https://pay.payos.vn/web/new-payment-link-id',
            qrCode: 'fresh-payos-qr-code',
            accountName: 'TICKET BOX',
            outcome: 'SUCCESS',
            raw: {
                paymentLinkId: 'new-payment-link-id',
                checkoutUrl: 'https://pay.payos.vn/web/new-payment-link-id',
                qrCode: 'fresh-payos-qr-code',
                status: 'PENDING',
            },
        }),
        getCircuitState: fn().mockReturnValue('CLOSED'),
        verifyWebhookSignature: fn(),
    };
    const service = new PaymentService(
        prisma as any,
        redis as any,
        gateway as any,
        { rollbackCategoryInventory: fn() } as any,
        { sendTicketConfirmation: fn() } as any,
    );

    const result = await service.processPayment(
        'user-1',
        { order_id: order.id, payment_method: PaymentMethod.PAYOS },
        '22222222-2222-4222-8222-222222222222',
    );

    assert.equal(result.payment_transaction_id, 'tx-replacement');
    assert.equal(result.qr_code, 'fresh-payos-qr-code');
    assert.equal(gateway.getPaymentSession.mock.calls[0][1], 139134);
    assert.equal(gateway.cancelPaymentSession.mock.calls[0][1], 139134);
    assert.equal(gateway.createPaymentSession.mock.calls.length, 1);
    assert.equal(create.mock.calls.length, 1);
    assert.equal(update.mock.calls[0][0].data.status, 'FAILED');
});

test('a new idempotency key returns the existing checkout transaction instead of creating another one', async () => {
    const existingTransaction = {
        id: 'tx-existing',
        order_id: 'order-1',
        payment_method: PaymentMethod.PAYOS,
        status: 'INIT',
        idempotency_key: '11111111-1111-4111-8111-111111111111',
        raw_response: {
            process: {
                checkoutUrl: 'https://pay.payos.vn/existing-link',
                qrCode: 'existing-qr',
                accountName: 'TICKET BOX',
                status: 'SUCCESS',
            },
        },
    };
    const order = {
        id: 'order-1',
        status: 'PENDING',
        total_amount: 200000,
        expires_at: new Date(Date.now() + 300_000),
        tickets: [],
        concert: { ticket_categories: [] },
        payment_transactions: [existingTransaction],
    };
    const cache = new Map<string, unknown>();
    const prisma = {
        order: { findFirst: fn().mockResolvedValue(order) },
        paymentTransaction: {
            findUnique: fn(),
            create: fn(),
            update: fn(),
        },
    };
    const redis = {
        getJson: fn().mockImplementation(async (key: string) => cache.get(key) ?? null),
        setIfAbsentJson: fn().mockImplementation(async (key: string, value: unknown) => {
            if (cache.has(key)) return false;
            cache.set(key, value);
            return true;
        }),
        setJson: fn().mockImplementation(async (key: string, value: unknown) => {
            cache.set(key, value);
            return true;
        }),
    };
    const gateway = {
        createPaymentSession: fn(),
        getCircuitState: fn().mockReturnValue('CLOSED'),
        verifyWebhookSignature: fn(),
    };
    const service = new PaymentService(
        prisma as any,
        redis as any,
        gateway as any,
        { rollbackCategoryInventory: fn() } as any,
        { sendTicketConfirmation: fn() } as any,
    );

    const result = await service.processPayment(
        'user-1',
        { order_id: order.id, payment_method: PaymentMethod.PAYOS },
        '22222222-2222-4222-8222-222222222222',
    );

    assert.equal(result.payment_transaction_id, existingTransaction.id);
    assert.equal(result.idempotency_key, existingTransaction.idempotency_key);
    assert.equal(result.checkout_url, 'https://pay.payos.vn/existing-link');
    assert.equal(gateway.createPaymentSession.mock.calls.length, 0);
    assert.equal(prisma.paymentTransaction.create.mock.calls.length, 0);
});

test('an open circuit rejects payment before creating a failed transaction row', async () => {
    const order = {
        id: 'order-1',
        status: 'PENDING',
        total_amount: 200000,
        expires_at: new Date(Date.now() + 300_000),
        tickets: [],
        concert: { ticket_categories: [] },
        payment_transactions: [],
    };
    const cache = new Map<string, unknown>();
    const prisma = {
        order: { findFirst: fn().mockResolvedValue(order) },
        paymentTransaction: {
            findUnique: fn().mockResolvedValue(null),
            create: fn(),
            update: fn(),
        },
    };
    const redis = {
        getJson: fn().mockImplementation(async (key: string) => cache.get(key) ?? null),
        setIfAbsentJson: fn().mockImplementation(async (key: string, value: unknown) => {
            if (cache.has(key)) return false;
            cache.set(key, value);
            return true;
        }),
        setJson: fn().mockImplementation(async (key: string, value: unknown) => {
            cache.set(key, value);
            return true;
        }),
    };
    const gateway = {
        createPaymentSession: fn(),
        getCircuitState: fn().mockReturnValue('OPEN'),
        verifyWebhookSignature: fn(),
    };
    const service = new PaymentService(
        prisma as any,
        redis as any,
        gateway as any,
        { rollbackCategoryInventory: fn() } as any,
        { sendTicketConfirmation: fn() } as any,
    );

    await assert.rejects(
        service.processPayment(
            'user-1',
            { order_id: order.id, payment_method: PaymentMethod.PAYOS },
            '33333333-3333-4333-8333-333333333333',
        ),
        /temporarily unavailable/,
    );

    assert.equal(prisma.paymentTransaction.create.mock.calls.length, 0);
    assert.equal(gateway.createPaymentSession.mock.calls.length, 0);
});
