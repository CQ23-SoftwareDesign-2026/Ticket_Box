import test from 'node:test';
import assert from 'node:assert/strict';
import { fn } from 'jest-mock';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminUsersService } from '../src/modules/admin-users/services/admin-users.service';

function createService() {
    const mockPrisma = {
        user: {
            findMany: fn(),
            count: fn(),
            findUnique: fn(),
            create: fn(),
            update: fn(),
        },
        role: {
            findMany: fn(),
        },
        userRole: {
            createMany: fn(),
            deleteMany: fn(),
        },
        order: {
            count: fn(),
            aggregate: fn(),
        },
        ticket: {
            count: fn(),
        },
        $transaction: fn(async (operationsOrCallback) => {
            if (Array.isArray(operationsOrCallback)) {
                return Promise.all(operationsOrCallback);
            }

            return operationsOrCallback(mockPrisma);
        }),
    };

    const service = new AdminUsersService(mockPrisma as any);
    return { service, mockPrisma };
}

test('getUsers returns paginated users with roles and counts', async () => {
    const { service, mockPrisma } = createService();
    const createdAt = new Date('2026-07-01T00:00:00.000Z');

    mockPrisma.user.findMany.mockResolvedValue([
        {
            id: 'user-1',
            email: 'checker@example.com',
            full_name: 'Checker User',
            status: 'ACTIVE',
            created_at: createdAt,
            user_roles: [{ role: { name: 'Checker' } }],
            orders: [
                { tickets: [{ id: 'ticket-1' }, { id: 'ticket-2' }] },
                { tickets: [{ id: 'ticket-3' }] },
            ],
            _count: { orders: 2 },
        },
    ]);
    mockPrisma.user.count.mockResolvedValue(1);

    const result = await service.getUsers({
        page: 1,
        limit: 20,
        search: 'checker',
        status: 'ACTIVE',
        role: 'Checker',
    });

    assert.deepEqual(mockPrisma.user.findMany.mock.calls[0][0].where, {
        status: 'ACTIVE',
        user_roles: { some: { role: { name: 'Checker' } } },
        OR: [
            { email: { contains: 'checker', mode: 'insensitive' } },
            { full_name: { contains: 'checker', mode: 'insensitive' } },
        ],
    });
    assert.deepEqual(result.items, [
        {
            id: 'user-1',
            email: 'checker@example.com',
            full_name: 'Checker User',
            status: 'ACTIVE',
            roles: ['Checker'],
            created_at: createdAt,
            order_count: 2,
            ticket_count: 3,
        },
    ]);
    assert.equal(result.meta.totalItems, 1);
});

test('createUser hashes password and assigns roles', async () => {
    const { service, mockPrisma } = createService();
    const createdAt = new Date('2026-07-02T00:00:00.000Z');

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.role.findMany.mockResolvedValue([
        { id: 'role-checker', name: 'Checker' },
        { id: 'role-audience', name: 'Audience' },
    ]);
    mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'checker@example.com',
        full_name: 'Checker User',
        status: 'ACTIVE',
        created_at: createdAt,
    });
    mockPrisma.userRole.createMany.mockResolvedValue({ count: 2 });

    const result = await service.createUser({
        email: 'checker@example.com',
        password: 'Password123!',
        full_name: 'Checker User',
        status: 'ACTIVE',
        roles: ['Checker', 'Audience'],
    });

    const createData = mockPrisma.user.create.mock.calls[0][0].data;
    assert.equal(createData.email, 'checker@example.com');
    assert.equal(createData.full_name, 'Checker User');
    assert.equal(createData.status, 'ACTIVE');
    assert.notEqual(createData.password_hash, 'Password123!');
    assert.deepEqual(mockPrisma.userRole.createMany.mock.calls[0][0].data, [
        { user_id: 'user-1', role_id: 'role-checker' },
        { user_id: 'user-1', role_id: 'role-audience' },
    ]);
    assert.deepEqual(result, {
        id: 'user-1',
        email: 'checker@example.com',
        full_name: 'Checker User',
        status: 'ACTIVE',
        roles: ['Checker', 'Audience'],
        created_at: createdAt,
    });
});

test('createUser rejects duplicate email and missing roles', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await assert.rejects(
        () => service.createUser({
            email: 'existing@example.com',
            password: 'Password123!',
            full_name: 'Existing User',
            roles: ['Audience'],
        }),
        BadRequestException,
    );

    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.role.findMany.mockResolvedValue([{ id: 'role-audience', name: 'Audience' }]);

    await assert.rejects(
        () => service.createUser({
            email: 'new@example.com',
            password: 'Password123!',
            full_name: 'New User',
            roles: ['Audience', 'MissingRole'],
        }),
        BadRequestException,
    );
});

test('getUserDetail returns stats and recent orders', async () => {
    const { service, mockPrisma } = createService();
    const createdAt = new Date('2026-07-01T00:00:00.000Z');
    const orderCreatedAt = new Date('2026-07-02T00:00:00.000Z');

    mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'audience@example.com',
        full_name: 'Audience User',
        status: 'ACTIVE',
        created_at: createdAt,
        user_roles: [{ role: { name: 'Audience' } }],
        orders: [
            {
                id: 'order-1',
                status: 'PAID',
                total_amount: '250000',
                created_at: orderCreatedAt,
                concert: { name: 'Concert A' },
                tickets: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
            },
        ],
    });
    mockPrisma.order.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);
    mockPrisma.ticket.count.mockResolvedValue(5);
    mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total_amount: { toString: () => '500000' } },
    });

    const result = await service.getUserDetail('user-1');

    assert.deepEqual(result, {
        id: 'user-1',
        email: 'audience@example.com',
        full_name: 'Audience User',
        status: 'ACTIVE',
        roles: ['Audience'],
        created_at: createdAt,
        stats: {
            order_count: 3,
            paid_order_count: 2,
            ticket_count: 5,
            total_spent: 500000,
        },
        recent_orders: [
            {
                order_id: 'order-1',
                concert_name: 'Concert A',
                status: 'PAID',
                total_amount: 250000,
                ticket_count: 2,
                created_at: orderCreatedAt,
            },
        ],
    });
});

test('getUserDetail throws when user is missing', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findUnique.mockResolvedValue(null);

    await assert.rejects(() => service.getUserDetail('missing-user'), NotFoundException);
});

test('updateStatus rejects self update and maps updated user', async () => {
    const { service, mockPrisma } = createService();
    const createdAt = new Date('2026-07-01T00:00:00.000Z');

    await assert.rejects(
        () => service.updateStatus('admin-1', 'admin-1', { status: 'BANNED' }),
        BadRequestException,
    );

    mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'Normal User',
        status: 'BANNED',
        created_at: createdAt,
        user_roles: [{ role: { name: 'Audience' } }],
        orders: [],
        _count: { orders: 0 },
    });

    const result = await service.updateStatus('user-1', 'admin-1', { status: 'BANNED' });

    assert.equal(mockPrisma.user.update.mock.calls[0][0].data.status, 'BANNED');
    assert.equal(result.status, 'BANNED');
});

test('updateRoles replaces user roles and returns user detail', async () => {
    const { service, mockPrisma } = createService();

    mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce({
            id: 'user-1',
            email: 'checker@example.com',
            full_name: 'Checker User',
            status: 'ACTIVE',
            created_at: new Date('2026-07-01T00:00:00.000Z'),
            user_roles: [{ role: { name: 'Checker' } }],
            orders: [],
        });
    mockPrisma.role.findMany.mockResolvedValue([{ id: 'role-checker', name: 'Checker' }]);
    mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.userRole.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.order.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
    mockPrisma.ticket.count.mockResolvedValue(0);
    mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total_amount: null } });

    const result = await service.updateRoles('user-1', 'admin-1', { roles: ['Checker'] });

    assert.deepEqual(mockPrisma.userRole.deleteMany.mock.calls[0][0], {
        where: { user_id: 'user-1' },
    });
    assert.deepEqual(mockPrisma.userRole.createMany.mock.calls[0][0].data, [
        { user_id: 'user-1', role_id: 'role-checker' },
    ]);
    assert.deepEqual(result.roles, ['Checker']);
});
