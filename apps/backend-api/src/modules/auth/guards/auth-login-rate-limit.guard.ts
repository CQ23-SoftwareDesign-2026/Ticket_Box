import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../shared/redis';
import { enforceTokenBuckets, resolveRequestIp } from '../../../shared/guards/token-bucket-rate-limit.util';

const DEFAULT_IP_BUCKET_CAPACITY = 10;
const DEFAULT_IP_REFILL_SECONDS = 60;
const DEFAULT_EMAIL_BUCKET_CAPACITY = 5;
const DEFAULT_EMAIL_REFILL_SECONDS = 60;

@Injectable()
export class AuthLoginRateLimitGuard implements CanActivate {
    private readonly logger = new Logger(AuthLoginRateLimitGuard.name);

    constructor(private readonly redisService: RedisService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const ip = resolveRequestIp(request);
        const email = typeof request.body?.email === 'string'
            ? request.body.email.trim().toLowerCase()
            : 'unknown';

        await enforceTokenBuckets(
            this.redisService,
            [
                {
                    key: `rate:login:ip:${ip}`,
                    capacity: Number(process.env.AUTH_LOGIN_IP_BUCKET_CAPACITY ?? DEFAULT_IP_BUCKET_CAPACITY),
                    refillMs: Number(process.env.AUTH_LOGIN_IP_REFILL_SECONDS ?? DEFAULT_IP_REFILL_SECONDS) * 1000,
                },
                {
                    key: `rate:login:email:${email}`,
                    capacity: Number(process.env.AUTH_LOGIN_EMAIL_BUCKET_CAPACITY ?? DEFAULT_EMAIL_BUCKET_CAPACITY),
                    refillMs: Number(process.env.AUTH_LOGIN_EMAIL_REFILL_SECONDS ?? DEFAULT_EMAIL_REFILL_SECONDS) * 1000,
                },
            ],
            'Too many login attempts. Please try again shortly.',
            this.logger,
        );

        return true;
    }
}
