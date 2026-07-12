import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConsumeMessage } from "amqplib";
import { PrismaService } from "../../../shared/prisma.service";
import { RabbitMqService } from "../../../shared/rabbitmq";
import { EmailService } from "../../../shared/email.service";
import { NotificationEvent } from "../notification.types";
import * as QRCode from "qrcode";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

@Injectable()
export class EmailNotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(EmailNotificationConsumer.name);
  constructor(
    private readonly rabbitMq: RabbitMqService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async onModuleInit() {
    await this.rabbitMq.consume(
      "notification.email.queue",
      (msg) => this.handle(msg),
      5,
    );
  }

  private async handle(msg: ConsumeMessage): Promise<void> {
    const payload = JSON.parse(msg.content.toString()) as {
      event: NotificationEvent;
      orderId?: string;
      concertId: string;
      userId: string;
    };
    try {
      if (
        payload.event === NotificationEvent.TICKET_PURCHASED &&
        payload.orderId
      )
        await this.sendTicketEmail(payload.orderId);
      else if (payload.event === NotificationEvent.CONCERT_REMINDER)
        await this.sendReminderEmail(payload.concertId, payload.userId);
      else throw new Error(`Unsupported notification event: ${payload.event}`);
    } catch (error) {
      const attempt = Number(msg.properties.headers?.["x-retry-count"] ?? 0);
      const target =
        attempt < 3
          ? "notification.email.retry.exchange"
          : "notification.email.dead.exchange";
      await this.rabbitMq.publish(target, "notification.email", payload, {
        "x-retry-count": attempt + 1,
      });
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Email ${payload.event} failed (${reason}); routed to ${target} (attempt ${attempt + 1})`,
      );
    }
  }

  private async sendTicketEmail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        concert: true,
        tickets: { include: { category: true } },
      },
    });
    if (!order) throw new Error(`Order ${orderId} not found`);
    const qrImages = await Promise.all(
      order.tickets.map((ticket) =>
        QRCode.toBuffer(ticket.qr_code_hash, {
          type: "png",
          width: 512,
          margin: 2,
          errorCorrectionLevel: "M",
        }),
      ),
    );
    const tickets = order.tickets
      .map(
        (ticket, index) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid #dbe2ea;border-radius:14px;background:#f8fafc;overflow:hidden">
        <tr><td style="padding:20px 16px 20px 20px;vertical-align:top">
          <div style="margin:0 0 12px;color:#4f46e5;font-size:13px;font-weight:800">VÉ ĐIỆN TỬ #${index + 1}</div>
          <div style="margin:0 0 8px;color:#0f172a;font-size:17px;font-weight:800">${escapeHtml(ticket.category.name)}</div>
          <div style="margin:0 0 16px;color:#475569;font-size:14px">Cổng soát vé: <strong style="color:#1e293b">${escapeHtml(ticket.category.gate_number ?? "Tự do")}</strong></div>
          <div style="padding-top:14px;border-top:1px solid #e2e8f0"><div style="margin-bottom:6px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase">Mã check-in</div><div style="max-width:330px;overflow-wrap:anywhere;color:#334155;font-family:Consolas,Monaco,monospace;font-size:11px;line-height:1.55">${escapeHtml(ticket.qr_code_hash)}</div></div>
        </td><td width="180" style="padding:16px 20px 16px 8px;text-align:center;vertical-align:middle">
          <img src="cid:ticket-qr-${index + 1}" width="164" height="164" alt="Mã QR vé ${index + 1}" style="display:block;width:164px;height:164px;margin:0 auto;border:8px solid #ffffff;border-radius:10px" />
          <div style="margin-top:8px;color:#64748b;font-size:10px">Quét mã này tại cổng</div>
        </td></tr>
      </table>`,
      )
      .join("");
    const total = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(order.total_amount));
    const startTime = order.concert.start_time.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
    const sent = await this.email.sendMail({
      to: order.user.email,
      subject: "Giao dịch thành công & Vé điện tử - TicketBox",
      html: `<!doctype html><html><body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#334155">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7"><tr><td style="padding:36px 12px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.08)">
            <tr><td style="padding:32px 36px;background:#4338ca;text-align:center;color:#ffffff"><div style="font-size:28px;font-weight:900">TicketBox</div><div style="margin-top:7px;color:#e0e7ff;font-size:13px">Vé của bạn đã sẵn sàng</div></td></tr>
            <tr><td style="padding:34px 36px 16px"><h1 style="margin:0 0 12px;color:#0f172a;font-size:25px;line-height:1.3">Mua vé thành công</h1><p style="margin:0 0 22px;color:#475569;font-size:15px;line-height:1.7">Chào <strong style="color:#1e293b">${escapeHtml(order.user.full_name)}</strong>, giao dịch của bạn đã hoàn tất. Hãy lưu email này để xuất trình e-ticket khi check-in.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px;background:#eef2ff;border-radius:12px"><tr><td style="padding:17px 18px"><div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase">Sự kiện</div><div style="margin-top:5px;color:#1e293b;font-size:16px;font-weight:800;line-height:1.45">${escapeHtml(order.concert.name)}</div><div style="margin-top:8px;color:#475569;font-size:13px;line-height:1.5">${escapeHtml(startTime)} · ${escapeHtml(order.concert.location)}</div></td><td style="padding:17px 18px;text-align:right;vertical-align:top"><div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase">Tổng thanh toán</div><div style="margin-top:5px;color:#4338ca;font-size:17px;font-weight:900;white-space:nowrap">${escapeHtml(total)}</div></td></tr></table>
              ${tickets}</td></tr>
            <tr><td style="padding:20px 36px 30px"><div style="padding:16px 18px;border-radius:12px;background:#fff7ed;color:#9a3412;font-size:13px;line-height:1.6"><strong>Lưu ý bảo mật:</strong> Không chia sẻ mã QR. Mỗi vé chỉ được check-in một lần.</div><p style="margin:24px 0 0;color:#64748b;font-size:11px;line-height:1.6;text-align:center">Email tự động từ TicketBox · Vui lòng không trả lời email này.</p></td></tr>
          </table>
        </td></tr></table></body></html>`,
      attachments: qrImages.map((content, index) => ({
        filename: `ticket-${index + 1}-${order.tickets[index].id}.png`,
        content,
        contentType: "image/png",
        cid: `ticket-qr-${index + 1}`,
      })),
    });
    if (!sent) throw new Error("Email provider rejected message");
  }

  private async sendReminderEmail(concertId: string, userId: string) {
    const [concert, user] = await Promise.all([
      this.prisma.concert.findUnique({ where: { id: concertId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!concert || !user) throw new Error("Concert or user not found");
    const start = concert.start_time.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
    const sent = await this.email.sendMail({
      to: user.email,
      subject: `Nhắc nhở: ${concert.name} sắp diễn ra`,
      html: `<p>Chào ${user.full_name},</p><p><strong>${concert.name}</strong> bắt đầu lúc ${start} tại ${concert.location}. Đừng quên e-ticket.</p>`,
    });
    if (!sent) throw new Error("Email provider rejected message");
  }
}
