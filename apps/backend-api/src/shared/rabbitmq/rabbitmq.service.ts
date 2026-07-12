import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

const ORDER_TTL_MS = 600_000; // 10 minutes

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RabbitMqService.name);
    private channelModel: amqp.ChannelModel | null = null;
    private publishChannel: amqp.ConfirmChannel | null = null;

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.close();
    }

    private async connect(): Promise<void> {
        const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        try {
            this.channelModel = await amqp.connect(url);
            this.channelModel.on('error', (err: Error) => {
                this.logger.error('[RabbitMQ] Connection error', err);
            });
            this.channelModel.on('close', () => {
                this.logger.warn('[RabbitMQ] Connection closed');
                this.channelModel = null;
                this.publishChannel = null;
            });

            this.publishChannel = await this.channelModel.createConfirmChannel();
            await this.assertTopology(this.publishChannel);
            this.logger.log(`[RabbitMQ] Connected to ${url}`);
        } catch (err) {
            this.logger.error('[RabbitMQ] Failed to connect', err);
            this.channelModel = null;
            this.publishChannel = null;
        }
    }

    private async assertTopology(channel: amqp.Channel): Promise<void> {
        // Main exchange for order events (fanout: one publish -> multiple queues)
        await channel.assertExchange('order.exchange', 'fanout', { durable: true });

        // Dead letter exchange for expired orders
        await channel.assertExchange('order.dlx.exchange', 'direct', { durable: true });

        // Queue for creating orders in DB
        await channel.assertQueue('order.create.queue', { durable: true });
        await channel.bindQueue('order.create.queue', 'order.exchange', '');

        // TTL queue: messages sit here for 10 minutes, then dead-letter to expired queue
        await channel.assertQueue('order.ttl.queue', {
            durable: true,
            arguments: {
                'x-message-ttl': ORDER_TTL_MS,
                'x-dead-letter-exchange': 'order.dlx.exchange',
                'x-dead-letter-routing-key': 'order.expired',
            },
        });
        await channel.bindQueue('order.ttl.queue', 'order.exchange', '');

        // Expired queue: receives dead-lettered messages from TTL queue
        await channel.assertQueue('order.expired.queue', { durable: true });
        await channel.bindQueue('order.expired.queue', 'order.dlx.exchange', 'order.expired');

        // Guest list import exchange
        await channel.assertExchange('guest.import.exchange', 'direct', { durable: true });

        // Guest list import queue
        await channel.assertQueue('guest.import.queue', { durable: true });
        await channel.bindQueue('guest.import.queue', 'guest.import.exchange', 'guest.import');

        // AI Biography Exchange and Queue
        await channel.assertExchange('ai.bio.exchange', 'direct', { durable: true });
        await channel.assertQueue('ai.bio.queue', { durable: true });
        await channel.bindQueue('ai.bio.queue', 'ai.bio.exchange', 'ai.bio');

        await channel.assertExchange('notification.email.exchange', 'direct', { durable: true });
        await channel.assertQueue('notification.email.queue', { durable: true });
        await channel.bindQueue('notification.email.queue', 'notification.email.exchange', 'notification.email');

        await channel.assertExchange('notification.email.retry.exchange', 'direct', { durable: true });
        await channel.assertQueue('notification.email.retry.queue', {
            durable: true,
            arguments: {
                'x-message-ttl': 60_000,
                'x-dead-letter-exchange': 'notification.email.exchange',
                'x-dead-letter-routing-key': 'notification.email',
            },
        });
        await channel.bindQueue('notification.email.retry.queue', 'notification.email.retry.exchange', 'notification.email');

        await channel.assertExchange('notification.email.dead.exchange', 'direct', { durable: true });
        await channel.assertQueue('notification.email.dead.queue', { durable: true });
        await channel.bindQueue('notification.email.dead.queue', 'notification.email.dead.exchange', 'notification.email');

        this.logger.log('[RabbitMQ] Topology asserted: exchanges, queues, and bindings ready');
    }

    async publish(exchange: string, routingKey: string, content: Record<string, unknown>, headers?: Record<string, unknown>): Promise<void> {
        if (!this.publishChannel) {
            throw new Error('RabbitMQ publish channel is not available');
        }

        const buffer = Buffer.from(JSON.stringify(content));
        const published = this.publishChannel.publish(exchange, routingKey, buffer, {
            persistent: true,
            contentType: 'application/json',
            headers,
        });

        if (!published) {
            throw new Error('RabbitMQ publish returned false (backpressure)');
        }
        await this.publishChannel.waitForConfirms();
    }

    async consume(
        queue: string,
        onMessage: (msg: amqp.ConsumeMessage) => Promise<void>,
        prefetch = 10,
    ): Promise<void> {
        if (!this.channelModel) {
            throw new Error('RabbitMQ connection is not available');
        }

        const channel = await this.channelModel.createChannel();
        await channel.prefetch(prefetch);

        await channel.consume(
            queue,
            async (msg: amqp.ConsumeMessage | null) => {
                if (!msg) return;
                try {
                    await onMessage(msg);
                    channel.ack(msg);
                } catch (err) {
                    this.logger.error(`[RabbitMQ] Error processing message from ${queue}`, err);
                    // Requeue the message for retry
                    channel.nack(msg, false, true);
                }
            },
            { noAck: false },
        );

        this.logger.log(`[RabbitMQ] Consumer started on queue: ${queue} (prefetch: ${prefetch})`);
    }

    isConnected(): boolean {
        return this.channelModel !== null && this.publishChannel !== null;
    }

    private async close(): Promise<void> {
        try {
            await this.publishChannel?.close();
            await this.channelModel?.close();
        } catch {
            // Ignore close errors
        }
        this.publishChannel = null;
        this.channelModel = null;
    }
}
