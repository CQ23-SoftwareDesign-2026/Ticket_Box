import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../shared/redis';
import { enforceTokenBuckets, resolveRequestIp } from '../../../shared/guards/token-bucket-rate-limit.util';

const DEFAULT_IP_BUCKET_CAPACITY = 120;
const DEFAULT_IP_REFILL_SECONDS = 60;

@Injectable()
export class ConcertDetailRateLimitGuard implements CanActivate {
    private readonly logger = new Logger(ConcertDetailRateLimitGuard.name);

    constructor(private readonly redisService: RedisService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const ip = resolveRequestIp(request);

        await enforceTokenBuckets(
            this.redisService,
            [
                {
                    key: `rate:concert-detail:ip:${ip}`,
                    capacity: Number(process.env.CONCERT_DETAIL_IP_BUCKET_CAPACITY ?? DEFAULT_IP_BUCKET_CAPACITY),
                    refillMs: Number(process.env.CONCERT_DETAIL_IP_REFILL_SECONDS ?? DEFAULT_IP_REFILL_SECONDS) * 1000,
                },
            ],
            'Too many concert detail requests. Please try again shortly.',
            this.logger,
        );

        return true;
    }
}
