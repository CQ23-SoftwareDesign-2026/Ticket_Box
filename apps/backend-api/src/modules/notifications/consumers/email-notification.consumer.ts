import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConsumeMessage } from "amqplib";
import { PrismaService } from "../../../shared/prisma.service";
import { RabbitMqService } from "../../../shared/rabbitmq";
import { EmailService } from "../../../shared/email.service";
import { NotificationEvent } from "../notification.types";

@Injectable()
export class EmailNotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(EmailNotificationConsumer.name);
  constructor(private readonly rabbitMq: RabbitMqService, private readonly prisma: PrismaService, private readonly email: EmailService) {}

  async onModuleInit() {
    await this.rabbitMq.consume("notification.email.queue", (msg) => this.handle(msg), 5);
  }

  private async handle(msg: ConsumeMessage): Promise<void> {
    const payload = JSON.parse(msg.content.toString()) as { event: NotificationEvent; orderId?: string; concertId: string; userId: string };
    try {
      if (payload.event === NotificationEvent.TICKET_PURCHASED && payload.orderId) await this.sendTicketEmail(payload.orderId);
      else if (payload.event === NotificationEvent.CONCERT_REMINDER) await this.sendReminderEmail(payload.concertId, payload.userId);
      else throw new Error(`Unsupported notification event: ${payload.event}`);
    } catch (error) {
      const attempt = Number(msg.properties.headers?.["x-retry-count"] ?? 0);
      const target = attempt < 3 ? "notification.email.retry.exchange" : "notification.email.dead.exchange";
      await this.rabbitMq.publish(target, "notification.email", payload, { "x-retry-count": attempt + 1 });
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Email ${payload.event} failed (${reason}); routed to ${target} (attempt ${attempt + 1})`);
    }
  }

  private async sendTicketEmail(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { user: true, concert: true, tickets: { include: { category: true } } } });
    if (!order) throw new Error(`Order ${orderId} not found`);
    const tickets = order.tickets.map((ticket) => `<li><strong>${ticket.category.name}</strong> — Cổng ${ticket.category.gate_number ?? "Tự do"}<br><code>${ticket.qr_code_hash}</code></li>`).join("");
    const sent = await this.email.sendMail({ to: order.user.email, subject: `Xác nhận mua vé ${order.concert.name} - TicketBox`, html: `<h1>Mua vé thành công</h1><p>Chào ${order.user.full_name}, e-ticket của bạn:</p><ul>${tickets}</ul>` });
    if (!sent) throw new Error("Email provider rejected message");
  }

  private async sendReminderEmail(concertId: string, userId: string) {
    const [concert, user] = await Promise.all([this.prisma.concert.findUnique({ where: { id: concertId } }), this.prisma.user.findUnique({ where: { id: userId } })]);
    if (!concert || !user) throw new Error("Concert or user not found");
    const start = concert.start_time.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const sent = await this.email.sendMail({ to: user.email, subject: `Nhắc nhở: ${concert.name} sắp diễn ra`, html: `<p>Chào ${user.full_name},</p><p><strong>${concert.name}</strong> bắt đầu lúc ${start} tại ${concert.location}. Đừng quên e-ticket.</p>` });
    if (!sent) throw new Error("Email provider rejected message");
  }
}
