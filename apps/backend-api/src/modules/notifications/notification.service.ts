import { Injectable, Logger, NotFoundException, ConflictException } from "@nestjs/common";
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
export class NotificationService {
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

  // Register new notification channels dynamically (Zalo, SMS, etc.)
  registerChannel(name: string, channel: NotificationChannel) {
    this.channels.set(name, channel);
    this.logger.log(`Successfully registered notification channel: ${name}`);
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

      const success = await channel.send(target, subject, content);

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

    // Build tickets list layout
    let ticketsHtml = "<ul>";
    for (const ticket of order.tickets) {
      ticketsHtml += `
        <li style="margin-bottom: 8px;">
          <strong>Vé:</strong> ${ticket.category.name} <br/>
          <strong>Cổng:</strong> ${ticket.category.gate_number ?? "Tự do"} <br/>
          <strong>Mã check-in (QR Hash):</strong> <code style="background: #f1f1f1; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${ticket.qr_code_hash}</code>
        </li>
      `;
    }
    ticketsHtml += "</ul>";

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
