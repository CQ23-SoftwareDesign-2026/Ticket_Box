import { BadRequestException, Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../../../shared/redis';
import { PrismaService } from '../../../shared/prisma.service';
import { RabbitMqService } from '../../../shared/rabbitmq';
import { ReserveTicketDto } from '../dtos/reserve-ticket.dto';

const RESERVE_TICKET_LUA = `
local user_key = KEYS[1]
local num_items = tonumber(ARGV[1])

-- 1. Check all categories first (Validation Phase)
for i = 1, num_items do
    local idx = 1 + (i - 1) * 3
    local category_id = ARGV[idx + 1]
    local quantity = tonumber(ARGV[idx + 2])
    local fallback_max_per_user = tonumber(ARGV[idx + 3])
    
    local category_key = "category:" .. category_id
    
    -- Check if category exists
    local exists = redis.call('EXISTS', category_key)
    if exists == 0 then
        return {"ERR_NOT_INITIALIZED", category_id}
    end
    
    -- Check available tickets
    local available = tonumber(redis.call('HGET', category_key, 'available') or "0")
    if available < quantity then
        return {"ERR_NO_TICKET", category_id, tostring(available)}
    end
    
    -- Check user limit
    local current_reserved = tonumber(redis.call('HGET', user_key, category_id) or "0")
    local limit = tonumber(redis.call('HGET', category_key, 'max_per_user') or tostring(fallback_max_per_user))
    
    if current_reserved + quantity > limit then
        return {"ERR_LIMIT_EXCEEDED", category_id, tostring(current_reserved)}
    end
end

-- 2. Deduct and increment (Execution Phase)
local remaining_list = {}
for i = 1, num_items do
    local idx = 1 + (i - 1) * 3
    local category_id = ARGV[idx + 1]
    local quantity = tonumber(ARGV[idx + 2])
    
    local category_key = "category:" .. category_id
    
    local new_available = redis.call('HINCRBY', category_key, 'available', -quantity)
    redis.call('HINCRBY', user_key, category_id, quantity)
    
    table.insert(remaining_list, category_id)
    table.insert(remaining_list, tostring(new_available))
end

return {"OK", unpack(remaining_list)}
`;

const ROLLBACK_TICKET_LUA = `
local user_key = KEYS[1]
local num_items = tonumber(ARGV[1])

for i = 1, num_items do
    local idx = 1 + (i - 1) * 2
    local category_id = ARGV[idx + 1]
    local quantity = tonumber(ARGV[idx + 2])
    
    local category_key = "category:" .. category_id
    
    redis.call('HINCRBY', category_key, 'available', quantity)
    local new_val = redis.call('HINCRBY', user_key, category_id, -quantity)
    if new_val <= 0 then
        redis.call('HDEL', user_key, category_id)
    end
end

return {"ROLLED_BACK"}
`;

@Injectable()
export class TicketingService implements OnModuleInit {
    private readonly logger = new Logger(TicketingService.name);

    constructor(
        private readonly redisService: RedisService,
        private readonly prisma: PrismaService,
        private readonly rabbitMqService: RabbitMqService,
    ) { }

    async onModuleInit() {
        try {
            await this.warmUpActiveConcertCaches();
        } catch (error) {
            this.logger.error('Failed to warm up active concert caches on startup', error);
        }
    }

    async warmUpActiveConcertCaches() {
        const client = this.redisService.getClient();
        if (!client || !client.isOpen) {
            this.logger.warn('Redis is not available, skipping startup cache warm-up');
            return;
        }

        const categories = await this.prisma.ticketCategory.findMany({
            where: {
                concert: {
                    status: 'PUBLISHED',
                },
            },
        });

        this.logger.log(`[Redis Warmup] Found ${categories.length} active ticket categories to warm up`);

        for (const cat of categories) {
            const key = `category:${cat.id}`;
            const exists = await client.exists(key);
            if (!exists) {
                // Count sold tickets
                const soldCount = await this.prisma.ticket.count({
                    where: { category_id: cat.id },
                });

                // Count pending unexpired tickets
                const pendingOrders = await this.prisma.order.findMany({
                    where: {
                        status: 'PENDING',
                        expires_at: {
                            gt: new Date(),
                        },
                    },
                });

                let pendingCount = 0;
                for (const order of pendingOrders) {
                    const metadata = order.ticket_metadata as any;
                    if (metadata && metadata.category_id === cat.id) {
                        pendingCount += metadata.quantity || 0;
                    }
                }

                const available = Math.max(0, cat.total_quantity - (soldCount + pendingCount));

                await client.hSet(key, {
                    available: available.toString(),
                    max_per_user: cat.max_per_user.toString(),
                    sales_start_at: cat.sales_start_at ? cat.sales_start_at.toISOString() : '',
                });
                this.logger.log(`[Redis Warmup] Initialized category ${cat.id} (${cat.name}) with available: ${available}, max_per_user: ${cat.max_per_user}, sales_start_at: ${cat.sales_start_at ?? 'none'}`);
            } else {
                this.logger.log(`[Redis Warmup] Category ${cat.id} is already initialized on Redis`);
            }
        }
    }

    async reserveTicket(userId: string, dto: ReserveTicketDto) {
        const { concert_id, items } = dto;
        const userKey = `user:${userId}:reservations`;

        // Check if any category has not started sales yet
        for (const item of items) {
            let salesStartAt: Date | null;
            const inventory = await this.getCategoryInventory(item.category_id);
            if (inventory) {
                salesStartAt = inventory.sales_start_at;
            } else {
                const category = await this.prisma.ticketCategory.findUnique({
                    where: { id: item.category_id },
                    select: { sales_start_at: true },
                });
                salesStartAt = category?.sales_start_at ?? null;
            }

            if (salesStartAt) {
                const now = new Date();
                if (now < salesStartAt) {
                    throw new BadRequestException('Hạng vé này chưa đến thời điểm mở bán.');
                }
            }
        }

        const args: string[] = [items.length.toString()];
        for (const item of items) {
            args.push(item.category_id, item.quantity.toString(), '100');
        }

        // Step 1: Atomically deduct tickets on Redis
        let result: any = [];
        let status: string = '';
        try {
            let retryCount = 0;
            const maxRetries = items.length + 1;

            while (retryCount < maxRetries) {
                result = await this.redisService.runLuaScript(
                    RESERVE_TICKET_LUA,
                    [userKey],
                    args
                );

                if (!Array.isArray(result) || result.length === 0) {
                    throw new BadRequestException('Hệ thống đặt vé gặp sự cố. Vui lòng thử lại sau.');
                }

                status = result[0];

                // Lazy Seeding: If Redis is not initialized, calculate and seed from DB, then retry
                if (status === 'ERR_NOT_INITIALIZED') {
                    const failedCategoryId = result[1];
                    this.logger.log(`[Lazy Seeding] Category ${failedCategoryId} not found in Redis. Seeding from DB...`);
                    const category = await this.prisma.ticketCategory.findUnique({
                        where: { id: failedCategoryId },
                    });
                    if (!category) {
                        throw new BadRequestException('Hạng vé này không tồn tại hoặc đã bị xóa.');
                    }

                    // Count sold tickets
                    const soldCount = await this.prisma.ticket.count({
                        where: { category_id: failedCategoryId },
                    });

                    // Count pending unexpired tickets
                    const pendingOrders = await this.prisma.order.findMany({
                        where: {
                            status: 'PENDING',
                            expires_at: {
                                gt: new Date(),
                            },
                        },
                    });

                    let pendingCount = 0;
                    for (const order of pendingOrders) {
                        const metadata = order.ticket_metadata as any;
                        if (metadata) {
                            if (metadata.category_id === failedCategoryId) {
                                pendingCount += metadata.quantity || 0;
                            } else if (Array.isArray(metadata.ticket_breakdown)) {
                                for (const breakItem of metadata.ticket_breakdown) {
                                    if (breakItem.category_id === failedCategoryId) {
                                        pendingCount += breakItem.quantity || 0;
                                    }
                                }
                            }
                        }
                    }

                    const available = Math.max(0, category.total_quantity - (soldCount + pendingCount));
                    this.logger.log(`[Lazy Seeding] Category ${failedCategoryId}: total=${category.total_quantity}, sold=${soldCount}, pending=${pendingCount}. Seeding available=${available}`);

                    await this.seedCategoryInventory(failedCategoryId, available, category.max_per_user);
                    retryCount++;
                } else {
                    break;
                }
            }

            if (status === 'ERR_NOT_INITIALIZED') {
                throw new BadRequestException('Hạng vé này chưa được mở bán hoặc cấu hình chưa sẵn sàng.');
            }
            if (status === 'ERR_NO_TICKET') {
                throw new BadRequestException('Vé của hạng này đã được đặt hết. Vui lòng chọn hạng vé khác.');
            }
            if (status === 'ERR_LIMIT_EXCEEDED') {
                throw new BadRequestException('Số lượng vé bạn chọn vượt quá giới hạn tối đa được phép mua cho mỗi tài khoản.');
            }

            if (status !== 'OK') {
                throw new BadRequestException('Lỗi đặt chỗ không xác định. Vui lòng thử lại.');
            }
        } catch (err) {
            if (err instanceof BadRequestException) {
                throw err;
            }
            this.logger.error('[Redis Error] Failed to complete atomic reservation or lazy seeding on Redis', err);
            throw new ServiceUnavailableException('Booking service temporarily unavailable. Please try again.');
        }

        const remainingMap: Record<string, number> = {};
        for (let i = 1; i < result.length; i += 2) {
            remainingMap[result[i]] = parseInt(result[i + 1], 10);
        }
        const orderId = randomUUID();

        // Step 2: Publish event to RabbitMQ (with Redis rollback on failure)
        try {
            await this.rabbitMqService.publish('order.exchange', '', {
                orderId,
                userId,
                concertId: concert_id,
                items: items.map(item => ({
                    categoryId: item.category_id,
                    quantity: item.quantity,
                })),
            });
        } catch (err) {
            // Rollback Redis if RabbitMQ publish fails
            this.logger.error(`[Reservation Rollback] RabbitMQ publish failed for order ${orderId}, rolling back Redis`, err);
            await this.rollbackCategoryInventory(userId, items);
            throw new ServiceUnavailableException('Booking service temporarily unavailable. Please try again.');
        }

        return {
            status: 'SUCCESS',
            order_id: orderId,
            items: items.map(item => ({
                category_id: item.category_id,
                quantity: item.quantity,
                remaining: remainingMap[item.category_id] ?? 0,
            })),
        };
    }

    async rollbackCategoryInventory(
        userId: string,
        items: string | Array<{ categoryId?: string; category_id?: string; quantity: number }>,
        quantity?: number
    ): Promise<void> {
        const userKey = `user:${userId}:reservations`;
        let normalizedItems: Array<{ category_id: string; quantity: number }> = [];

        if (typeof items === 'string') {
            normalizedItems.push({
                category_id: items,
                quantity: quantity || 0,
            });
        } else if (Array.isArray(items)) {
            normalizedItems = items.map(item => ({
                category_id: item.category_id || item.categoryId || '',
                quantity: item.quantity,
            })).filter(item => item.category_id !== '');
        }

        if (normalizedItems.length === 0) {
            return;
        }

        const args: string[] = [normalizedItems.length.toString()];
        for (const item of normalizedItems) {
            args.push(item.category_id, item.quantity.toString());
        }

        try {
            await this.redisService.runLuaScript(
                ROLLBACK_TICKET_LUA,
                [userKey],
                args
            );
            this.logger.log(`[Rollback] Restored tickets for user ${userId}: ${JSON.stringify(normalizedItems)}`);
        } catch (err) {
            this.logger.error(`[Rollback Failed] Could not restore tickets for user ${userId}`, err);
        }
    }

    async seedCategoryInventory(categoryId: string, available: number, maxPerUser: number, salesStartAt?: Date | null): Promise<void> {
        const client = this.redisService.getClient();
        if (!client || !client.isOpen) {
            throw new Error('Redis is not available');
        }
        const key = `category:${categoryId}`;
        await client.hSet(key, {
            available: available.toString(),
            max_per_user: maxPerUser.toString(),
            sales_start_at: salesStartAt ? salesStartAt.toISOString() : '',
        });
        this.logger.log(`Seeded category ${categoryId} with available: ${available}, max_per_user: ${maxPerUser}, sales_start_at: ${salesStartAt ?? 'none'}`);
    }

    async getCategoryInventory(categoryId: string) {
        const client = this.redisService.getClient();
        if (!client || !client.isOpen) {
            return null;
        }
        const data = await client.hGetAll(`category:${categoryId}`);
        if (!data || Object.keys(data).length === 0) {
            return null;
        }
        return {
            available: parseInt(data.available, 10),
            max_per_user: parseInt(data.max_per_user, 10),
            sales_start_at: data.sales_start_at ? new Date(data.sales_start_at) : null,
        };
    }

    async getOrSeedInventory(categoryId: string): Promise<number> {
        const cached = await this.getCategoryInventory(categoryId);
        if (cached !== null) {
            return cached.available;
        }

        const category = await this.prisma.ticketCategory.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            return 0;
        }

        // Count sold tickets
        const soldCount = await this.prisma.ticket.count({
            where: { category_id: categoryId },
        });

        // Count pending unexpired tickets
        const pendingOrders = await this.prisma.order.findMany({
            where: {
                status: 'PENDING',
                expires_at: {
                    gt: new Date(),
                },
            },
        });

        let pendingCount = 0;
        for (const order of pendingOrders) {
            const rawMetadata = order.ticket_metadata;
            if (rawMetadata) {
                try {
                    const metadata = typeof rawMetadata === 'string' ? JSON.parse(rawMetadata) : (rawMetadata as any);
                    if (metadata.category_id === categoryId) {
                        pendingCount += metadata.quantity || 0;
                    } else if (Array.isArray(metadata.ticket_breakdown)) {
                        for (const breakItem of metadata.ticket_breakdown) {
                            if (breakItem.category_id === categoryId) {
                                pendingCount += breakItem.quantity || 0;
                            }
                        }
                    }
                } catch (jsonErr) {
                    this.logger.error(`Failed to parse ticket_metadata for order ${order.id}`, jsonErr);
                }
            }
        }

        const available = Math.max(0, category.total_quantity - (soldCount + pendingCount));
        
        try {
            await this.seedCategoryInventory(categoryId, available, category.max_per_user, category.sales_start_at);
        } catch (err) {
            this.logger.error(`[Lazy Seeding Failed] Could not cache category ${categoryId} on Redis`, err);
        }

        return available;
    }

    async getUserReservations(userId: string) {
        const client = this.redisService.getClient();
        if (!client || !client.isOpen) {
            return {};
        }
        const data = await client.hGetAll(`user:${userId}:reservations`);
        const result: Record<string, number> = {};
        for (const [key, val] of Object.entries(data)) {
            result[key] = parseInt(val, 10);
        }
        return result;
    }
}