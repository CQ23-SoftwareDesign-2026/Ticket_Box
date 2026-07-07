import { Injectable, Logger, NotFoundException, ConflictException, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../shared/prisma.service";
import { EmailService } from "../../shared/email.service";
import { QueryNotificationLogsDto } from "./dtos/query-notification-logs.dto";
import { CreateTemplateDto } from "./dtos/create-template.dto";
import { UpdateTemplateDto } from "./dtos/update-template.dto";

export interface NotificationChannel {
  send(target: string, subject: string, content: string, metadata?: any): Promise<boolean>;
}

class EmailChannel implements NotificationChannel {
  constructor(private readonly emailService: EmailService) {}

  async send(target: string, subject: string, content: string): Promise<boolean> {
    return this.emailService.sendMail({
      to: target,
      subject: subject,
      html: content,
    });
  }
}

class AppChannel implements NotificationChannel {
  private readonly logger = new Logger(AppChannel.name);

  async send(target: string, subject: string, content: string): Promise<boolean> {
    this.logger.log(`[APP PUSH NOTIFICATION] Target: ${target} | Title: ${subject} | Body: ${content}`);
    return true;
  }
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private channels: Map<string, NotificationChannel> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    // Register default channels (Strategy Pattern)
    this.channels.set("EMAIL", new EmailChannel(this.emailService));
    this.channels.set("APP", new AppChannel());
  }

  // Auto-seed/update templates on module initialization
  async onModuleInit() {
    this.logger.log("Checking and seeding default notification templates...");
    try {
      // 1. TICKET_CONFIRMATION
      const ticketConfirmTpl = await this.prisma.notificationTemplate.findFirst({
        where: { code: "TICKET_CONFIRMATION" },
      });

      const richTicketConfirmContent = `<p>Chào <strong>{{fullName}}</strong>,</p>
<p>Chúc mừng bạn đã đặt vé thành công cho sự kiện <strong>{{concert_name}}</strong>!</p>
<p>Tổng tiền thanh toán: <strong>{{total_amount}}</strong>.</p>
<p>Dưới đây là chi tiết vé điện tử (e-ticket) của bạn để xuất trình tại cổng check-in:</p>
{{tickets_list}}
<p style="margin-top: 20px;">Vui lòng bảo mật thông tin mã vé này để check-in tại sự kiện.</p>`;

      if (!ticketConfirmTpl) {
        await this.prisma.notificationTemplate.create({
          data: {
            code: "TICKET_CONFIRMATION",
            channel: "EMAIL",
            subject: "🎫 Xác nhận đặt vé thành công - TicketBox",
            content: richTicketConfirmContent,
          },
        });
        this.logger.log("Seeded TICKET_CONFIRMATION template");
      } else if (
        ticketConfirmTpl.content.includes("attached to this email") ||
        ticketConfirmTpl.subject.includes("ready") ||
        !ticketConfirmTpl.content.includes("tickets_list")
      ) {
        await this.prisma.notificationTemplate.update({
          where: { id: ticketConfirmTpl.id },
          data: {
            subject: "🎫 Giao dịch thành công & Vé điện tử - TicketBox",
            content: richTicketConfirmContent,
          },
        });
        this.logger.log("Updated TICKET_CONFIRMATION to rich template");
      }

      // 2. CONCERT_REMINDER
      const concertReminderTpl = await this.prisma.notificationTemplate.findFirst({
        where: { code: "CONCERT_REMINDER" },
      });

      const richConcertReminderContent = `<p>Chào <strong>{{fullName}}</strong>,</p>
<p>Sự kiện bạn mong đợi <strong>{{concert_name}}</strong> sắp diễn ra chỉ còn chưa đầy 24 giờ nữa!</p>
<div style="background-color: #f8fafc; border-left: 4.5px solid #4f46e5; padding: 15px; margin: 20px 0; border-radius: 0 12px 12px 0; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
  <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">📅 <strong>Thời gian bắt đầu:</strong> {{start_time}}</p>
  <p style="margin: 0; font-size: 14px; color: #1e293b;">📍 <strong>Địa điểm tổ chức:</strong> {{location}}</p>
</div>
<p>Hãy chuẩn bị sẵn vé điện tử (e-ticket) để check-in nhanh chóng tại cổng soát vé nhé.</p>
<p>Hẹn gặp lại bạn tại sự kiện!</p>`;

      if (!concertReminderTpl) {
        await this.prisma.notificationTemplate.create({
          data: {
            code: "CONCERT_REMINDER",
            channel: "EMAIL",
            subject: "⏰ Nhắc nhở: Sự kiện {{concert_name}} sắp diễn ra!",
            content: richConcertReminderContent,
          },
        });
        this.logger.log("Seeded CONCERT_REMINDER template");
      } else if (!concertReminderTpl.content.includes("Thời gian bắt đầu:")) {
        await this.prisma.notificationTemplate.update({
          where: { id: concertReminderTpl.id },
          data: {
            subject: "⏰ Nhắc nhở: Sự kiện {{concert_name}} sắp diễn ra!",
            content: richConcertReminderContent,
          },
        });
        this.logger.log("Updated CONCERT_REMINDER to rich template");
      }
    } catch (error) {
      this.logger.error("Failed to seed/update default templates:", error);
    }
  }

  // Register new notification channels dynamically (Zalo, SMS, etc.)
  registerChannel(name: string, channel: NotificationChannel) {
    this.channels.set(name, channel);
    this.logger.log(`Successfully registered notification channel: ${name}`);
  }

  private wrapWithBaseTemplate(subject: string, content: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #1e293b;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      color: rgba(255, 255, 255, 0.8);
      margin: 8px 0 0 0;
      font-size: 13px;
      font-weight: 500;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
      font-size: 15px;
      color: #334155;
    }
    .content p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #f1f5f9;
    }
    .footer a {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>TicketBox</h1>
        <p>Hệ thống phân phối vé sự kiện hàng đầu</p>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>Cảm ơn bạn đã tin tưởng lựa chọn TicketBox.</p>
        <p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ <a href="mailto:support@ticketbox.io.vn">support@ticketbox.io.vn</a> hoặc hotline 1900-XXXX.</p>
        <p style="margin-top: 15px; font-size: 11px;">© 2026 TicketBox. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  async sendNotification(
    userId: string,
    templateCode: string,
    target: string,
    variables: Record<string, string>,
  ): Promise<boolean> {
    try {
      // Find template
      let template = await this.prisma.notificationTemplate.findFirst({
        where: { code: templateCode },
      });

      if (!template) {
        // Fallback: create dynamic template if not seeded
        template = await this.prisma.notificationTemplate.create({
          data: {
            code: templateCode,
            channel: templateCode.startsWith("APP_") ? "APP" : "EMAIL",
            subject:
              templateCode === "CONCERT_REMINDER"
                ? "🎫 Nhắc nhở: Sự kiện {{concert_name}} sắp diễn ra!"
                : "🎫 TicketBox - Thông báo giao dịch",
            content:
              templateCode === "CONCERT_REMINDER"
                ? "<p>Chào {{fullName}}, sự kiện <strong>{{concert_name}}</strong> của bạn sắp bắt đầu lúc {{start_time}} tại {{location}}. Đừng quên chuẩn bị sẵn e-ticket nhé!</p>"
                : "<p>Chào {{fullName}}, giao dịch của bạn đã thành công!</p>",
          },
        });
      }

      // Replace placeholders in subject and content
      let subject = template.subject;
      let content = template.content;
      for (const [key, value] of Object.entries(variables)) {
        subject = subject.replace(new RegExp(`{{${key}}}`, "g"), value || "");
        content = content.replace(new RegExp(`{{${key}}}`, "g"), value || "");
      }

      // Wrap with base skeleton layout for EMAIL channel
      let finalContent = content;
      if (template.channel === "EMAIL") {
        finalContent = this.wrapWithBaseTemplate(subject, content);
      }

      // Create pending log
      const log = await this.prisma.notificationLog.create({
        data: {
          user_id: userId,
          template_id: template.id,
          target,
          status: "PENDING",
          retry_count: 0,
        },
      });

      const channel = this.channels.get(template.channel);
      if (!channel) {
        const errorMsg = `Channel ${template.channel} not found in registered strategy channels.`;
        this.logger.error(errorMsg);
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: "FAILED",
            error_message: errorMsg,
          },
        });
        return false;
      }

      // Send the finalized HTML content for email strategy
      const success = await channel.send(target, subject, finalContent);

      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: success ? "SENT" : "FAILED",
          sent_at: success ? new Date() : null,
          error_message: success ? null : "Failed to deliver message via provider",
        },
      });

      return success;
    } catch (err: any) {
      this.logger.error(`Error sending notification ${templateCode} to ${target}:`, err);
      return false;
    }
  }

  async sendTicketConfirmation(orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        concert: true,
        tickets: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!order || !order.user) {
      this.logger.error(`Cannot send ticket confirmation: Order ${orderId} not found or user not attached.`);
      return false;
    }

    const formatVND = (value: number) =>
      new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

    // Build tickets list layout with gorgeous card-like layout
    let ticketsHtml = '<div style="margin-top: 15px;">';
    for (const ticket of order.tickets) {
      ticketsHtml += `
        <div style="background-color: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 15px; border-left: 5px solid #4f46e5;">
          <div style="font-size: 16px; font-weight: bold; color: #4f46e5; margin-bottom: 8px;">🎫 VÉ ĐIỆN TỬ</div>
          <div style="font-size: 14px; margin-bottom: 6px; color: #1e293b;">
            <strong>Hạng vé:</strong> <span style="font-weight: 600;">${ticket.category.name}</span>
          </div>
          <div style="font-size: 14px; margin-bottom: 10px; color: #1e293b;">
            <strong>Cổng soát vé:</strong> <span style="font-weight: 600;">Cổng ${ticket.category.gate_number ?? "Tự do"}</span>
          </div>
          <div style="border-top: 1px dashed #e2e8f0; padding-top: 12px; margin-top: 12px;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Mã Check-in (QR Hash)</div>
            <div style="display: inline-block; background-color: #f1f5f9; color: #0f172a; padding: 8px 14px; border-radius: 8px; font-family: monospace; font-weight: bold; font-size: 14px; margin-top: 6px; border: 1px solid #e2e8f0; letter-spacing: 0.5px;">
              ${ticket.qr_code_hash}
            </div>
          </div>
        </div>
      `;
    }
    ticketsHtml += "</div>";

    const emailVariables = {
      fullName: order.user.full_name,
      concert_name: order.concert.name,
      total_amount: formatVND(Number(order.total_amount.toString())),
      tickets_list: ticketsHtml,
    };

    // 1. Send Email confirmation with e-ticket details
    const emailSuccess = await this.sendNotification(
      order.user.id,
      "TICKET_CONFIRMATION",
      order.user.email,
      emailVariables,
    );

    // 2. Send App notification
    const appVariables = {
      fullName: order.user.full_name,
      concert_name: order.concert.name,
    };

    await this.sendNotification(
      order.user.id,
      "APP_PAYMENT_SUCCESS",
      order.user.full_name,
      appVariables,
    );

    return emailSuccess;
  }

  // Admin Logs Query
  async getLogs(query: QueryNotificationLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = Math.max(0, (page - 1) * limit);

    const search = query.search?.trim();
    const where: Prisma.NotificationLogWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.template_code ? { template: { code: query.template_code } } : {}),
      ...(search
        ? {
            OR: [
              { target: { contains: search, mode: "insensitive" } },
              { user: { full_name: { contains: search, mode: "insensitive" } } },
              { user: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationLog.findMany({
        skip,
        take: limit,
        where,
        include: {
          user: { select: { full_name: true, email: true } },
          template: { select: { code: true, channel: true, subject: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return {
      data: items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async getLogDetail(id: string) {
    const log = await this.prisma.notificationLog.findUnique({
      where: { id },
      include: {
        user: { select: { full_name: true, email: true } },
        template: true,
      },
    });
    if (!log) {
      throw new NotFoundException("Notification log entry not found");
    }
    return log;
  }

  // Admin Template CRUD
  async getTemplates() {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { code: "asc" },
    });
  }

  async getTemplateDetail(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException("Notification template not found");
    }
    return template;
  }

  async createTemplate(dto: CreateTemplateDto) {
    const existing = await this.prisma.notificationTemplate.findFirst({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Notification template with code '${dto.code}' already exists`);
    }
    return this.prisma.notificationTemplate.create({
      data: {
        code: dto.code,
        channel: dto.channel,
        subject: dto.subject,
        content: dto.content,
      },
    });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    await this.getTemplateDetail(id); // Throws if not exists
    return this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        channel: dto.channel,
        subject: dto.subject,
        content: dto.content,
      },
    });
  }

  async deleteTemplate(id: string) {
    await this.getTemplateDetail(id); // Throws if not exists
    return this.prisma.notificationTemplate.delete({
      where: { id },
    });
  }
}
