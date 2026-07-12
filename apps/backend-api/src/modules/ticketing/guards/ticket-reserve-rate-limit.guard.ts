import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
} from '@nestjs/common';
import { RedisService } from '../../../shared/redis';
import { enforceTokenBuckets, resolveRequestIp } from '../../../shared/guards/token-bucket-rate-limit.util';

const DEFAULT_USER_BUCKET_CAPACITY = 3;
const DEFAULT_USER_REFILL_SECONDS = 20;
const DEFAULT_IP_BUCKET_CAPACITY = 60;
const DEFAULT_IP_REFILL_SECONDS = 1;
@Injectable()
export class TicketReserveRateLimitGuard implements CanActivate {
    private readonly logger = new Logger(TicketReserveRateLimitGuard.name);

    constructor(private readonly redisService: RedisService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.sub ?? 'anonymous';
        const ip = resolveRequestIp(request);
        const userCapacity = Number(process.env.TICKET_RESERVE_USER_BUCKET_CAPACITY ?? DEFAULT_USER_BUCKET_CAPACITY);
        const userRefillMs = Number(process.env.TICKET_RESERVE_USER_REFILL_SECONDS ?? DEFAULT_USER_REFILL_SECONDS) * 1000;
        const ipCapacity = Number(process.env.TICKET_RESERVE_IP_BUCKET_CAPACITY ?? DEFAULT_IP_BUCKET_CAPACITY);
        const ipRefillMs = Number(process.env.TICKET_RESERVE_IP_REFILL_SECONDS ?? DEFAULT_IP_REFILL_SECONDS) * 1000;

        await enforceTokenBuckets(
            this.redisService,
            [
                { key: `rate:reserve:user:${userId}`, capacity: userCapacity, refillMs: userRefillMs },
                { key: `rate:reserve:ip:${ip}`, capacity: ipCapacity, refillMs: ipRefillMs },
            ],
            'Too many ticket reservation requests. Please try again shortly.',
            this.logger,
        );

        return true;
    }
}
