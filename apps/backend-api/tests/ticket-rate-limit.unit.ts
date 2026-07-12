import test from 'node:test';
import assert from 'node:assert/strict';
import { fn } from 'jest-mock';
import { TicketReserveRateLimitGuard } from '../src/modules/ticketing/guards/ticket-reserve-rate-limit.guard';

function createContext(overrides: Record<string, unknown> = {}) {
    const request = {
        headers: {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        user: { sub: 'user-1' },
        ...overrides,
    };

    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
    } as any;
}

function createGuard() {
    const redisService = {
        getClient: fn().mockReturnValue({ isOpen: true }),
        runLuaScript: fn().mockResolvedValue(['ALLOW']),
    };

    return {
        guard: new TicketReserveRateLimitGuard(redisService as any),
        redisService,
    };
}

test('TicketReserveRateLimitGuard allows request when token buckets have capacity', async () => {
    const { guard, redisService } = createGuard();

    const result = await guard.canActivate(createContext());

    assert.equal(result, true);
    assert.equal(redisService.runLuaScript.mock.calls.length, 1);
    assert.deepEqual(redisService.runLuaScript.mock.calls[0][1], [
        'rate:reserve:user:user-1',
        'rate:reserve:ip:127.0.0.1',
    ]);
});

test('TicketReserveRateLimitGuard throws 429 when a bucket is empty', async () => {
    const { guard, redisService } = createGuard();
    redisService.runLuaScript.mockResolvedValue(['REJECT', 'rate:reserve:user:user-1', '10000']);

    await assert.rejects(
        () => guard.canActivate(createContext()),
        (error: any) => {
            assert.equal(error.getStatus(), 429);
            assert.equal(error.message, 'Too many ticket reservation requests. Please try again shortly.');
            return true;
        },
    );
});

test('TicketReserveRateLimitGuard uses x-forwarded-for as the client IP when present', async () => {
    const { guard, redisService } = createGuard();

    await guard.canActivate(createContext({
        headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
    }));

    assert.deepEqual(redisService.runLuaScript.mock.calls[0][1], [
        'rate:reserve:user:user-1',
        'rate:reserve:ip:203.0.113.10',
    ]);
});

test('TicketReserveRateLimitGuard allows request when Redis is unavailable', async () => {
    const redisService = {
        getClient: fn().mockReturnValue(null),
        runLuaScript: fn(),
    };
    const guard = new TicketReserveRateLimitGuard(redisService as any);

    const result = await guard.canActivate(createContext());

    assert.equal(result, true);
    assert.equal(redisService.runLuaScript.mock.calls.length, 0);
});

test('TicketReserveRateLimitGuard fails open when Redis check errors unexpectedly', async () => {
    const { guard, redisService } = createGuard();
    redisService.runLuaScript.mockRejectedValue(new Error('Redis unavailable'));

    const result = await guard.canActivate(createContext());

    assert.equal(result, true);
});
