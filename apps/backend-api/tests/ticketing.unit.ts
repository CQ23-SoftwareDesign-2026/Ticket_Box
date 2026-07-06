import test from 'node:test';
import assert from 'node:assert/strict';
import { fn } from 'jest-mock';
import { TicketingService } from '../src/modules/ticketing/services/ticketing.service';

function createService() {
    const mockRedisClient = {
        hSet: fn(),
        hGetAll: fn(),
        isOpen: true,
    };

    const redisService = {
        runLuaScript: fn(),
        getClient: fn().mockReturnValue(mockRedisClient),
    };

    const mockPrisma = {
        ticketCategory: {
            findMany: fn(),
            findUnique: fn().mockResolvedValue(null),
        },
        ticket: {
            count: fn().mockResolvedValue(0),
        },
        order: {
            findMany: fn().mockResolvedValue([]),
        },
    };

    const rabbitMqService = {
        publish: fn().mockResolvedValue(undefined),
        isConnected: fn().mockReturnValue(true),
    };

    const service = new TicketingService(redisService as any, mockPrisma as any, rabbitMqService as any);

    return { service, redisService, mockRedisClient, mockPrisma, rabbitMqService };
}

test('reserveTicket returns SUCCESS with order_id when Lua script returns OK and RabbitMQ publish succeeds', async () => {
    const { service, redisService, rabbitMqService } = createService();

    redisService.runLuaScript.mockResolvedValue(['OK', 'category-1', '8']);

    const result = await service.reserveTicket('user-1', {
        concert_id: 'concert-1',
        items: [
            { category_id: 'category-1', quantity: 2 }
        ],
    });

    // Verify Redis Lua script was called
    assert.equal(redisService.runLuaScript.mock.calls.length, 1);
    assert.deepEqual(redisService.runLuaScript.mock.calls[0][1], ['user:user-1:reservations']);
    assert.deepEqual(redisService.runLuaScript.mock.calls[0][2], ['1', 'category-1', '2', '100']);

    // Verify RabbitMQ publish was called with correct exchange
    assert.equal(rabbitMqService.publish.mock.calls.length, 1);
    assert.equal(rabbitMqService.publish.mock.calls[0][0], 'order.exchange');
    assert.equal(rabbitMqService.publish.mock.calls[0][1], '');

    // Verify the published payload contains correct data
    const publishedPayload = rabbitMqService.publish.mock.calls[0][2];
    assert.equal(publishedPayload.userId, 'user-1');
    assert.equal(publishedPayload.concertId, 'concert-1');
    assert.deepEqual(publishedPayload.items, [{ categoryId: 'category-1', quantity: 2 }]);
    assert.ok(publishedPayload.orderId); // UUID should be present

    // Verify result contains order_id
    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.order_id, publishedPayload.orderId);
    assert.deepEqual(result.items, [
        { category_id: 'category-1', quantity: 2, remaining: 8 }
    ]);
});

test('reserveTicket rolls back Redis and throws ServiceUnavailableException when RabbitMQ publish fails', async () => {
    const { service, redisService, rabbitMqService } = createService();

    // First call: reserve succeeds on Redis
    redisService.runLuaScript
        .mockResolvedValueOnce(['OK', 'category-1', '8'])  // reserve success
        .mockResolvedValueOnce(['ROLLED_BACK']);   // rollback

    // RabbitMQ publish fails
    rabbitMqService.publish.mockRejectedValue(new Error('Connection refused'));

    await assert.rejects(
        async () => {
            await service.reserveTicket('user-1', {
                concert_id: 'concert-1',
                items: [
                    { category_id: 'category-1', quantity: 2 }
                ],
            });
        },
        (err: any) => {
            assert.equal(err.name, 'ServiceUnavailableException');
            return true;
        }
    );

    // Verify rollback Lua script was called (second runLuaScript call)
    assert.equal(redisService.runLuaScript.mock.calls.length, 2);
    // Verify rollback keys and args
    assert.deepEqual(redisService.runLuaScript.mock.calls[1][1], ['user:user-1:reservations']);
    assert.deepEqual(redisService.runLuaScript.mock.calls[1][2], ['1', 'category-1', '2']);
});

test('reserveTicket throws BadRequestException when inventory is not initialized', async () => {
    const { service, redisService } = createService();

    redisService.runLuaScript.mockResolvedValue(['ERR_NOT_INITIALIZED', 'category-1']);

    await assert.rejects(
        async () => {
            await service.reserveTicket('user-1', {
                concert_id: 'concert-1',
                items: [
                    { category_id: 'category-1', quantity: 2 }
                ],
            });
        },
        (err: any) => {
            assert.equal(err.name, 'BadRequestException');
            assert.equal(err.message, 'Hạng vé này không tồn tại hoặc đã bị xóa.');
            return true;
        }
    );
});

test('reserveTicket throws BadRequestException when tickets are depleted', async () => {
    const { service, redisService } = createService();

    redisService.runLuaScript.mockResolvedValue(['ERR_NO_TICKET', 'category-1', '0']);

    await assert.rejects(
        async () => {
            await service.reserveTicket('user-1', {
                concert_id: 'concert-1',
                items: [
                    { category_id: 'category-1', quantity: 2 }
                ],
            });
        },
        (err: any) => {
            assert.equal(err.name, 'BadRequestException');
            assert.equal(err.message, 'Vé của hạng này đã được đặt hết. Vui lòng chọn hạng vé khác.');
            return true;
        }
    );
});

test('reserveTicket throws BadRequestException when user limit is exceeded', async () => {
    const { service, redisService } = createService();

    redisService.runLuaScript.mockResolvedValue(['ERR_LIMIT_EXCEEDED', 'category-1', '2']);

    await assert.rejects(
        async () => {
            await service.reserveTicket('user-1', {
                concert_id: 'concert-1',
                items: [
                    { category_id: 'category-1', quantity: 2 }
                ],
            });
        },
        (err: any) => {
            assert.equal(err.name, 'BadRequestException');
            assert.equal(err.message, 'Số lượng vé bạn chọn vượt quá giới hạn tối đa được phép mua cho mỗi tài khoản.');
            return true;
        }
    );
});

test('seedCategoryInventory correctly calls Redis HSET', async () => {
    const { service, mockRedisClient } = createService();

    mockRedisClient.hSet.mockResolvedValue(1);

    await service.seedCategoryInventory('category-123', 50, 4);

    assert.equal(mockRedisClient.hSet.mock.calls.length, 1);
    assert.equal(mockRedisClient.hSet.mock.calls[0][0], 'category:category-123');
    assert.deepEqual(mockRedisClient.hSet.mock.calls[0][1], {
        available: '50',
        max_per_user: '4',
        sales_start_at: '',
    });
});

test('getCategoryInventory parses values correctly', async () => {
    const { service, mockRedisClient } = createService();

    mockRedisClient.hGetAll.mockResolvedValue({
        available: '45',
        max_per_user: '2',
    });

    const result = await service.getCategoryInventory('category-123');

    assert.equal(mockRedisClient.hGetAll.mock.calls.length, 1);
    assert.equal(mockRedisClient.hGetAll.mock.calls[0][0], 'category:category-123');
    assert.deepEqual(result, {
        available: 45,
        max_per_user: 2,
        sales_start_at: null,
    });
});

test('rollbackCategoryInventory calls rollback Lua script with correct keys and args (legacy)', async () => {
    const { service, redisService } = createService();

    redisService.runLuaScript.mockResolvedValue(['ROLLED_BACK']);

    await service.rollbackCategoryInventory('user-1', 'category-1', 3);

    assert.equal(redisService.runLuaScript.mock.calls.length, 1);
    assert.deepEqual(redisService.runLuaScript.mock.calls[0][1], ['user:user-1:reservations']);
    assert.deepEqual(redisService.runLuaScript.mock.calls[0][2], ['1', 'category-1', '3']);
});

test('rollbackCategoryInventory batch calls rollback Lua script with correct keys and args', async () => {
    const { service, redisService } = createService();

    redisService.runLuaScript.mockResolvedValue(['ROLLED_BACK']);

    await service.rollbackCategoryInventory('user-1', [
        { category_id: 'category-1', quantity: 3 },
        { category_id: 'category-2', quantity: 2 }
    ]);

    assert.equal(redisService.runLuaScript.mock.calls.length, 1);
    assert.deepEqual(redisService.runLuaScript.mock.calls[0][1], ['user:user-1:reservations']);
    assert.deepEqual(redisService.runLuaScript.mock.calls[0][2], ['2', 'category-1', '3', 'category-2', '2']);
});

test('reserveTicket performs Lazy Seeding when Redis returns ERR_NOT_INITIALIZED and succeeds on retry', async () => {
    const { service, redisService, mockPrisma, mockRedisClient } = createService();

    // 1st Lua call: ERR_NOT_INITIALIZED, 2nd Lua call: OK
    redisService.runLuaScript
        .mockResolvedValueOnce(['ERR_NOT_INITIALIZED', 'category-1'])
        .mockResolvedValueOnce(['OK', 'category-1', '8']);

    mockPrisma.ticketCategory.findUnique.mockResolvedValue({
        id: 'category-1',
        total_quantity: 10,
        max_per_user: 4,
    });
    mockPrisma.ticket.count.mockResolvedValue(1); // 1 ticket sold
    mockPrisma.order.findMany.mockResolvedValue([
        {
            status: 'PENDING',
            ticket_metadata: {
                category_id: 'category-1',
                quantity: 1, // 1 ticket pending
            },
        },
    ]);
    mockRedisClient.hSet.mockResolvedValue(1);

    const result = await service.reserveTicket('user-1', {
        concert_id: 'concert-1',
        items: [
            { category_id: 'category-1', quantity: 2 }
        ],
    });

    // Check that Redis runLuaScript was called twice (once initial, once after seeding)
    assert.equal(redisService.runLuaScript.mock.calls.length, 2);

    // Check that DB queries were called
    assert.equal(mockPrisma.ticketCategory.findUnique.mock.calls.length, 2);
    assert.equal(mockPrisma.ticket.count.mock.calls.length, 1);
    assert.equal(mockPrisma.order.findMany.mock.calls.length, 1);

    // Check that Redis was seeded with computed available amount (10 total - 1 sold - 1 pending = 8 available)
    assert.equal(mockRedisClient.hSet.mock.calls.length, 1);
    assert.equal(mockRedisClient.hSet.mock.calls[0][0], 'category:category-1');
    assert.deepEqual(mockRedisClient.hSet.mock.calls[0][1], {
        available: '8',
        max_per_user: '4',
        sales_start_at: '',
    });

    assert.equal(result.status, 'SUCCESS');
    assert.deepEqual(result.items, [
        { category_id: 'category-1', quantity: 2, remaining: 8 }
    ]);
});

test('reserveTicket throws ERR_NOT_INITIALIZED if category is not found in DB during lazy seeding', async () => {
    const { service, redisService, mockPrisma } = createService();

    redisService.runLuaScript.mockResolvedValue(['ERR_NOT_INITIALIZED', 'category-1']);
    mockPrisma.ticketCategory.findUnique.mockResolvedValue(null); // not found

    await assert.rejects(
        async () => {
            await service.reserveTicket('user-1', {
                concert_id: 'concert-1',
                items: [
                    { category_id: 'category-1', quantity: 2 }
                ],
            });
        },
        (err: any) => {
            assert.equal(err.name, 'BadRequestException');
            assert.equal(err.message, 'Hạng vé này không tồn tại hoặc đã bị xóa.');
            return true;
        }
    );
});

test('reserveTicket throws ServiceUnavailableException when Redis runLuaScript throws an error (Redis is down)', async () => {
    const { service, redisService } = createService();

    redisService.runLuaScript.mockRejectedValue(new Error('Redis connection lost'));

    await assert.rejects(
        async () => {
            await service.reserveTicket('user-1', {
                concert_id: 'concert-1',
                items: [
                    { category_id: 'category-1', quantity: 2 }
                ],
            });
        },
        (err: any) => {
            assert.equal(err.name, 'ServiceUnavailableException');
            assert.equal(err.message, 'Booking service temporarily unavailable. Please try again.');
            return true;
        }
    );
});

test('reserveTicket throws BadRequestException when sales_start_at is in the future', async () => {
    const { service, mockRedisClient } = createService();

    // Set sales_start_at to a date in the future
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2); // 2 hours from now

    mockRedisClient.hGetAll.mockResolvedValue({
        available: '100',
        max_per_user: '4',
        sales_start_at: futureDate.toISOString(),
    });

    await assert.rejects(
        async () => {
            await service.reserveTicket('user-1', {
                concert_id: 'concert-1',
                items: [
                    { category_id: 'category-1', quantity: 2 }
                ],
            });
        },
        (err: any) => {
            assert.equal(err.name, 'BadRequestException');
            assert.equal(err.message, 'Hạng vé này chưa đến thời điểm mở bán.');
            return true;
        }
    );
});


