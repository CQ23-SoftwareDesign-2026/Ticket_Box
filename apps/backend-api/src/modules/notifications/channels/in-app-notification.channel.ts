import { Injectable } from "@nestjs/common";
import { NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma.service";
import { NotificationStreamService } from "../notification-stream.service";
import { NotificationChannel, NotificationContext, NotificationEvent } from "../notification.types";

@Injectable()
export class InAppNotificationChannel implements NotificationChannel {
  readonly name = "IN_APP";
  constructor(private readonly prisma: PrismaService, private readonly stream: NotificationStreamService) {}

  supports(event: NotificationEvent): boolean {
    return event === NotificationEvent.TICKET_PURCHASED || event === NotificationEvent.CONCERT_REMINDER;
  }

  async send(context: NotificationContext) {
    const purchased = context.event === NotificationEvent.TICKET_PURCHASED;
    const deduplicationKey = purchased
      ? `ticket-purchased:${context.orderId}`
      : `concert-reminder:${context.concertId}:${context.userId}`;
    const notification = await this.prisma.notification.upsert({
      where: { deduplication_key: deduplicationKey },
      create: {
        user_id: context.userId,
        order_id: purchased ? context.orderId : null,
        concert_id: context.concertId,
        type: purchased ? NotificationType.TICKET_PURCHASED : NotificationType.CONCERT_REMINDER,
        deduplication_key: deduplicationKey,
        title: purchased ? "Mua vé thành công" : "Concert sắp diễn ra",
        message: purchased
          ? `Vé concert ${context.concertName} của bạn đã sẵn sàng.`
          : `${context.concertName} sẽ bắt đầu trong vòng 24 giờ tới.`,
        data: {
          concertId: context.concertId,
          ...(purchased ? { orderId: context.orderId, route: `/orders/${context.orderId}` } : {}),
        } satisfies Prisma.JsonObject,
      },
      update: {},
    });
    this.stream.publish(context.userId, notification);
    return notification;
  }
}
