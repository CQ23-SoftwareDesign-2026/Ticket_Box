import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RedisService } from '../redis';

const TOKEN_BUCKET_TTL_SECONDS = 120;

const TOKEN_BUCKET_LUA = `
local now = tonumber(ARGV[1])
local ttl_seconds = tonumber(ARGV[2])
local checks = tonumber(ARGV[3])
local states = {}

for i = 1, checks do
    local key = KEYS[i]
    local arg_idx = 3 + ((i - 1) * 2)
    local capacity = tonumber(ARGV[arg_idx + 1])
    local refill_ms = tonumber(ARGV[arg_idx + 2])
    local data = redis.call('HMGET', key, 'tokens', 'updated_at')
    local tokens = tonumber(data[1])
    local updated_at = tonumber(data[2])

    if tokens == nil or updated_at == nil then
        tokens = capacity
        updated_at = now
    else
        local elapsed = math.max(0, now - updated_at)
        local refill = elapsed / refill_ms
        tokens = math.min(capacity, tokens + refill)
        updated_at = now
    end

    if tokens < 1 then
        local retry_ms = math.ceil((1 - tokens) * refill_ms)
        return {'REJECT', key, tostring(retry_ms)}
    end

    states[i] = {key, tokens - 1, updated_at}
end

for i = 1, checks do
    redis.call('HSET', states[i][1], 'tokens', tostring(states[i][2]), 'updated_at', tostring(states[i][3]))
    redis.call('EXPIRE', states[i][1], ttl_seconds)
end

return {'ALLOW'}
`;

export type TokenBucketCheck = {
    key: string;
    capacity: number;
    refillMs: number;
};

export async function enforceTokenBuckets(
    redisService: RedisService,
    checks: TokenBucketCheck[],
    message: string,
    logger: Logger,
): Promise<void> {
    const client = redisService.getClient();
    if (!client || !client.isOpen) {
        return;
    }

    try {
        const result = await redisService.runLuaScript(
            TOKEN_BUCKET_LUA,
            checks.map((check) => check.key),
            [
                Date.now().toString(),
                TOKEN_BUCKET_TTL_SECONDS.toString(),
                checks.length.toString(),
                ...checks.flatMap((check) => [
                    check.capacity.toString(),
                    check.refillMs.toString(),
                ]),
            ],
        );

        if (Array.isArray(result) && result[0] === 'REJECT') {
            throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
        }
    } catch (error) {
        if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
            throw error;
        }

        logger.warn('Rate limit check failed; allowing request to continue', error as Error);
    }
}

export function resolveRequestIp(request: any): string {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }

    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
}
