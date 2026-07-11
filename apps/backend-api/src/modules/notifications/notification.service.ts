import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Notification, Prisma } from "@prisma/client";
import { PrismaService } from "../../shared/prisma.service";
import { NOTIFICATION_CHANNELS, NotificationChannel, NotificationContext, NotificationEvent } from "./notification.types";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_CHANNELS) private readonly channels: NotificationChannel[],
  ) {}

  async sendTicketConfirmation(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        concert: true,
        tickets: { include: { category: true } },
      },
    });

    if (!order || !order.user) {
      throw new NotFoundException(`Order ${orderId} was not found`);
    }

    const context: NotificationContext = {
      event: NotificationEvent.TICKET_PURCHASED,
      orderId: order.id,
      userId: order.user.id,
      email: order.user.email,
      fullName: order.user.full_name,
      concertId: order.concert.id,
      concertName: order.concert.name,
      totalAmount: Number(order.total_amount),
      tickets: order.tickets.map((ticket) => ({
        id: ticket.id,
        categoryName: ticket.category.name,
        gateNumber: ticket.category.gate_number,
        qrCodeHash: ticket.qr_code_hash,
      })),
    };

    await this.dispatch(context);
  }

  async sendConcertReminder(context: Omit<Extract<NotificationContext, { event: NotificationEvent.CONCERT_REMINDER }>, "event">) {
    await this.dispatch({ event: NotificationEvent.CONCERT_REMINDER, ...context });
  }

  private async dispatch(context: NotificationContext): Promise<void> {
    const results = await Promise.allSettled(
      this.channels.filter((channel) => channel.supports(context.event)).map((channel) => channel.send(context)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        this.logger.error("A notification channel failed", result.reason);
      }
    }
  }

  async list(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const where: Prisma.NotificationWhereInput = {
      user_id: userId,
      ...(unreadOnly ? { read_at: null } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: items,
      meta: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
    };
  }

  async unreadCount(userId: string) {
    return { count: await this.prisma.notification.count({ where: { user_id: userId, read_at: null } }) };
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({ where: { id, user_id: userId } });
    if (!notification) throw new NotFoundException("Notification not found");
    if (notification.read_at) return notification;
    return this.prisma.notification.update({ where: { id }, data: { read_at: new Date() } });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
    return { updated: result.count };
  }
}
