import test from 'node:test';
import assert from 'node:assert/strict';
import { fn } from 'jest-mock';
import { NotFoundException } from '@nestjs/common';
import { AdminRevenueService } from '../src/modules/admin-revenue/services/admin-revenue.service';

function createService() {
    const mockPrisma = {
        order: {
            findMany: fn(),
        },
        concert: {
            findMany: fn(),
            findUnique: fn(),
        },
    };

    const service = new AdminRevenueService(mockPrisma as any);
    return { service, mockPrisma };
}

test('getTrend returns grouped system revenue with range metadata', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.order.findMany.mockResolvedValue([
        {
            total_amount: '100000',
            created_at: new Date('2026-07-01T10:00:00.000Z'),
            tickets: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
        },
        {
            total_amount: { toString: () => '50000' },
            created_at: new Date('2026-07-01T12:00:00.000Z'),
            tickets: [{ id: 'ticket-3' }],
        },
        {
            total_amount: '75000',
            created_at: new Date('2026-07-02T09:00:00.000Z'),
            tickets: [],
        },
    ]);

    const result = await service.getTrend({
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-31T23:59:59.999Z',
        group_by: 'day',
    });

    assert.deepEqual(mockPrisma.order.findMany.mock.calls[0][0].where, {
        status: 'PAID',
        created_at: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-31T23:59:59.999Z'),
        },
    });
    assert.deepEqual(result, {
        group_by: 'day',
        from: new Date('2026-07-01T00:00:00.000Z'),
        to: new Date('2026-07-31T23:59:59.999Z'),
        items: [
            {
                period: '2026-07-01',
                revenue: 150000,
                paid_orders: 2,
                tickets_sold: 3,
            },
            {
                period: '2026-07-02',
                revenue: 75000,
                paid_orders: 1,
                tickets_sold: 0,
            },
        ],
    });
});

test('getByConcert returns revenue metrics for each concert', async () => {
    const { service, mockPrisma } = createService();

    const startTime = new Date('2026-08-10T12:00:00.000Z');
    mockPrisma.concert.findMany.mockResolvedValue([
        {
            id: 'concert-1',
            name: 'Music Night',
            status: 'PUBLISHED',
            start_time: startTime,
            poster_url: 'https://example.com/poster.png',
            location: 'Hanoi',
            orders: [
                {
                    total_amount: '200000',
                    tickets: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
                },
                {
                    total_amount: '150000',
                    tickets: [{ id: 'ticket-3' }],
                },
            ],
        },
    ]);

    const result = await service.getByConcert({
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-31T23:59:59.999Z',
        status: 'PUBLISHED' as any,
        limit: 20,
    });

    assert.deepEqual(mockPrisma.concert.findMany.mock.calls[0][0].where, { status: 'PUBLISHED' });
    assert.equal(mockPrisma.concert.findMany.mock.calls[0][0].take, 20);
    assert.deepEqual(mockPrisma.concert.findMany.mock.calls[0][0].select.orders.where, {
        status: 'PAID',
        created_at: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-31T23:59:59.999Z'),
        },
    });
    assert.deepEqual(result, {
        items: [
            {
                concert_id: 'concert-1',
                concert_name: 'Music Night',
                status: 'PUBLISHED',
                start_time: startTime,
                poster_url: 'https://example.com/poster.png',
                location: 'Hanoi',
                revenue: 350000,
                paid_orders: 2,
                tickets_sold: 3,
            },
        ],
    });
});

test('getConcertDetail returns summary and ticket tier breakdown', async () => {
    const { service, mockPrisma } = createService();

    const startTime = new Date('2026-08-10T12:00:00.000Z');
    mockPrisma.concert.findUnique.mockResolvedValue({
        id: 'concert-1',
        name: 'Music Night',
        status: 'PUBLISHED',
        start_time: startTime,
        poster_url: 'https://example.com/poster.png',
        location: 'Hanoi Stadium',
        ticket_categories: [
            {
                id: 'category-vip',
                name: 'VIP',
                price: { toString: () => '500000' },
                total_quantity: 100,
                gate_number: 1,
                tickets: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
            },
            {
                id: 'category-standard',
                name: 'Standard',
                price: '200000',
                total_quantity: 200,
                gate_number: 2,
                tickets: [{ id: 'ticket-3' }],
            },
        ],
    });
    mockPrisma.order.findMany.mockResolvedValue([
        {
            total_amount: '700000',
            tickets: [{ id: 'ticket-1' }, { id: 'ticket-3' }],
        },
        {
            total_amount: '500000',
            tickets: [{ id: 'ticket-2' }],
        },
    ]);

    const result = await service.getConcertDetail('concert-1', {
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-31T23:59:59.999Z',
    });

    assert.deepEqual(mockPrisma.concert.findUnique.mock.calls[0][0].where, { id: 'concert-1' });
    assert.deepEqual(mockPrisma.order.findMany.mock.calls[0][0].where, {
        concert_id: 'concert-1',
        status: 'PAID',
        created_at: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-31T23:59:59.999Z'),
        },
    });
    assert.deepEqual(result, {
        concert: {
            id: 'concert-1',
            name: 'Music Night',
            status: 'PUBLISHED',
            start_time: startTime,
            poster_url: 'https://example.com/poster.png',
            location: 'Hanoi Stadium',
        },
        total_revenue: 1200000,
        paid_orders: 2,
        tickets_sold: 3,
        ticket_tiers: [
            {
                category_id: 'category-vip',
                name: 'VIP',
                price: 500000,
                total_quantity: 100,
                tickets_sold: 2,
                remaining_quantity: 98,
                revenue: 1000000,
                gate_number: 1,
            },
            {
                category_id: 'category-standard',
                name: 'Standard',
                price: 200000,
                total_quantity: 200,
                tickets_sold: 1,
                remaining_quantity: 199,
                revenue: 200000,
                gate_number: 2,
            },
        ],
    });
});

test('getConcertDetail throws when concert does not exist', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.concert.findUnique.mockResolvedValue(null);

    await assert.rejects(
        () => service.getConcertDetail('missing-concert', {}),
        NotFoundException,
    );
    assert.equal(mockPrisma.order.findMany.mock.calls.length, 0);
});
