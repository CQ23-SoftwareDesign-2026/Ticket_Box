import test from 'node:test';
import assert from 'node:assert/strict';
import { fn } from 'jest-mock';
import { PaymentGatewayClient } from '../src/modules/payment/services/gateway/payment-gateway.client';
import { PaymentMethod } from '../src/modules/payment/dtos/payment-method.enum';
import { ConcertService } from '../src/modules/catalog/services/concert.service';

test('an open payment circuit fast-fails while concert and inventory reads still work', async () => {
    const createPaymentSession = fn().mockRejectedValue(new Error('PayOS unavailable'));
    const gateway = new PaymentGatewayClient({ createPaymentSession } as any);
    const input = { orderId: 'order-1', providerOrderCode: 100001, amount: 100000, userId: 'user-1', idempotencyKey: 'key-1' };

    for (let attempt = 0; attempt < 4; attempt += 1) {
        await assert.rejects(gateway.createPaymentSession(PaymentMethod.PAYOS, input));
    }
    assert.equal(gateway.getCircuitState(PaymentMethod.PAYOS), 'OPEN');

    await assert.rejects(gateway.createPaymentSession(PaymentMethod.PAYOS, input));
    assert.equal(createPaymentSession.mock.calls.length, 4, 'open circuit must not call PayOS again');

    const concertRepo = {
        findById: fn().mockResolvedValue({
            id: 'concert-1',
            name: 'Concert A',
            ticketTiers: [{ id: 'tier-1', remaining_quantity: 0, status: 'available' }],
        }),
    };
    const redis = { getJson: fn().mockResolvedValue(null), setJson: fn().mockResolvedValue(true) };
    const ticketing = { getOrSeedInventory: fn().mockResolvedValue(25) };
    const catalog = new ConcertService(concertRepo as any, redis as any, ticketing as any);

    const result = await catalog.getConcertById('concert-1');
    assert.equal(result.id, 'concert-1');
    assert.equal(result.ticketTiers[0].remaining_quantity, 25);
});
