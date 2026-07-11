import { Injectable } from "@nestjs/common";
import { RabbitMqService } from "../../../shared/rabbitmq";
import { NotificationChannel, NotificationContext, NotificationEvent } from "../notification.types";

@Injectable()
export class EmailNotificationChannel implements NotificationChannel {
  readonly name = "EMAIL";
  constructor(private readonly rabbitMq: RabbitMqService) {}

  supports(event: NotificationEvent): boolean {
    return event === NotificationEvent.TICKET_PURCHASED || event === NotificationEvent.CONCERT_REMINDER;
  }

  async send(context: NotificationContext): Promise<void> {
    await this.rabbitMq.publish("notification.email.exchange", "notification.email", {
      event: context.event,
      orderId: context.event === NotificationEvent.TICKET_PURCHASED ? context.orderId : undefined,
      concertId: context.concertId,
      userId: context.userId,
    });
  }
}
