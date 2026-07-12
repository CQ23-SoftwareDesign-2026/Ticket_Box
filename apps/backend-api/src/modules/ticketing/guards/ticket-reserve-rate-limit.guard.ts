import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
} from '@nestjs/common';
import { RedisService } from '../../../shared/redis';

const DEFAULT_USER_BUCKET_CAPACITY = 3;
const DEFAULT_USER_REFILL_SECONDS = 20;
const DEFAULT_IP_BUCKET_CAPACITY = 60;
const DEFAULT_IP_REFILL_SECONDS = 1;
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

@Injectable()
export class TicketReserveRateLimitGuard implements CanActivate {
    private readonly logger = new Logger(TicketReserveRateLimitGuard.name);

    constructor(private readonly redisService: RedisService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const client = this.redisService.getClient();
        if (!client || !client.isOpen) {
            return true;
        }

        const userId = request.user?.sub ?? 'anonymous';
        const ip = this.resolveIp(request);
        const userCapacity = Number(process.env.TICKET_RESERVE_USER_BUCKET_CAPACITY ?? DEFAULT_USER_BUCKET_CAPACITY);
        const userRefillMs = Number(process.env.TICKET_RESERVE_USER_REFILL_SECONDS ?? DEFAULT_USER_REFILL_SECONDS) * 1000;
        const ipCapacity = Number(process.env.TICKET_RESERVE_IP_BUCKET_CAPACITY ?? DEFAULT_IP_BUCKET_CAPACITY);
        const ipRefillMs = Number(process.env.TICKET_RESERVE_IP_REFILL_SECONDS ?? DEFAULT_IP_REFILL_SECONDS) * 1000;

        try {
            const result = await this.redisService.runLuaScript(
                TOKEN_BUCKET_LUA,
                [`rate:reserve:user:${userId}`, `rate:reserve:ip:${ip}`],
                [
                    Date.now().toString(),
                    TOKEN_BUCKET_TTL_SECONDS.toString(),
                    '2',
                    userCapacity.toString(),
                    userRefillMs.toString(),
                    ipCapacity.toString(),
                    ipRefillMs.toString(),
                ],
            );

            if (Array.isArray(result) && result[0] === 'REJECT') {
                throw new HttpException('Too many ticket reservation requests. Please try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
            }
        } catch (error) {
            if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
                throw error;
            }

            this.logger.warn('Reserve rate limit check failed; allowing request to continue', error as Error);
            return true;
        }

        return true;
    }

    private resolveIp(request: any): string {
        const forwardedFor = request.headers?.['x-forwarded-for'];
        if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
            return forwardedFor.split(',')[0].trim();
        }

        return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    }
}
