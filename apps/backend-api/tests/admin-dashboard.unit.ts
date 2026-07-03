import test from 'node:test';
import assert from 'node:assert/strict';
import { fn } from 'jest-mock';
import { AdminDashboardService } from '../src/modules/admin-dashboard/services/admin-dashboard.service';

function createService() {
    const mockPrisma = {
        order: {
            aggregate: fn(),
            findMany: fn(),
        },
        ticket: {
            count: fn(),
        },
        user: {
            count: fn(),
        },
        concert: {
            count: fn(),
        },
        $transaction: fn(async (operations) => Promise.all(operations)),
    };

    const service = new AdminDashboardService(mockPrisma as any);
    return { service, mockPrisma };
}

test('getSummary returns top-level dashboard metrics', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total_amount: { toString: () => '1250000.50' } },
    });
    mockPrisma.ticket.count.mockResolvedValue(5600);
    mockPrisma.user.count.mockResolvedValue(12000);
    mockPrisma.concert.count.mockResolvedValue(8);

    const result = await service.getSummary();

    assert.deepEqual(mockPrisma.order.aggregate.mock.calls[0][0], {
        where: { status: 'PAID' },
        _sum: { total_amount: true },
    });
    assert.deepEqual(mockPrisma.ticket.count.mock.calls[0][0], {
        where: {
            order: {
                status: 'PAID',
            },
        },
    });
    assert.deepEqual(result, {
        total_revenue: 1250000.5,
        tickets_sold: 5600,
        total_users: 12000,
        published_events: 8,
    });
});

test('getRevenue groups paid orders by day', async () => {
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

    const result = await service.getRevenue({
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
    assert.deepEqual(result, [
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
    ]);
});

test('getRevenue groups paid orders by month', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.order.findMany.mockResolvedValue([
        {
            total_amount: '100000',
            created_at: new Date('2026-07-01T10:00:00.000Z'),
            tickets: [{ id: 'ticket-1' }],
        },
        {
            total_amount: '200000',
            created_at: new Date('2026-07-20T10:00:00.000Z'),
            tickets: [{ id: 'ticket-2' }, { id: 'ticket-3' }],
        },
    ]);

    const result = await service.getRevenue({
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-31T23:59:59.999Z',
        group_by: 'month',
    });

    assert.deepEqual(result, [
        {
            period: '2026-07',
            revenue: 300000,
            paid_orders: 2,
            tickets_sold: 3,
        },
    ]);
});

test('getRecentOrders returns mapped latest orders', async () => {
    const { service, mockPrisma } = createService();

    const createdAt = new Date('2026-07-02T10:00:00.000Z');
    mockPrisma.order.findMany.mockResolvedValue([
        {
            id: 'order-1',
            user: {
                full_name: 'Nguyen Van A',
                email: 'a@example.com',
            },
            concert: {
                name: 'Concert A',
            },
            status: 'PAID',
            total_amount: '1500000',
            tickets: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
            created_at: createdAt,
        },
    ]);

    const result = await service.getRecentOrders({ limit: 10 });

    assert.equal(mockPrisma.order.findMany.mock.calls[0][0].take, 10);
    assert.deepEqual(result, [
        {
            order_id: 'order-1',
            customer_name: 'Nguyen Van A',
            customer_email: 'a@example.com',
            concert_name: 'Concert A',
            status: 'PAID',
            total_amount: 1500000,
            ticket_count: 2,
            created_at: createdAt,
        },
    ]);
});
