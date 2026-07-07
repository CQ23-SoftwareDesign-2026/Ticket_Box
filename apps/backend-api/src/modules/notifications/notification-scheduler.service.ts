import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../shared/prisma.service";
import { NotificationService } from "./notification.service";

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // Run every hour to check for concerts starting in the next 24 hours
  @Cron(CronExpression.EVERY_HOUR)
  async handleConcertReminders() {
    this.logger.log("Starting scheduled check for upcoming concert reminders (24h)...");
    try {
      const now = new Date();
      const targetMin = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
      const targetMax = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Find concerts starting within 23 to 24 hours
      const upcomingConcerts = await this.prisma.concert.findMany({
        where: {
          start_time: {
            gte: targetMin,
            lte: targetMax,
          },
        },
      });

      if (upcomingConcerts.length === 0) {
        this.logger.log("No concerts starting in the next 24 hours.");
        return;
      }

      for (const concert of upcomingConcerts) {
        this.logger.log(`Processing reminders for concert: ${concert.name} (starts at ${concert.start_time})`);

        // Find all successful orders for this concert
        const orders = await this.prisma.order.findMany({
          where: {
            concert_id: concert.id,
            status: "PAID",
          },
          include: {
            user: true,
          },
        });

        this.logger.log(`Found ${orders.length} paid orders for concert ${concert.name}`);

        for (const order of orders) {
          if (!order.user) continue;

          // Check if we already sent a reminder to this user for this concert
          const existingLog = await this.prisma.notificationLog.findFirst({
            where: {
              user_id: order.user_id,
              template: {
                code: "CONCERT_REMINDER",
              },
              target: order.user.email,
              created_at: {
                gte: new Date(now.getTime() - 48 * 60 * 60 * 1000), // in the last 48 hours
              },
            },
          });

          if (existingLog) {
            this.logger.log(
              `User ${order.user.email} already received a reminder for concert ${concert.name}. Skipping.`,
            );
            continue;
          }

          // Send reminder
          const variables = {
            fullName: order.user.full_name,
            concert_name: concert.name,
            start_time: concert.start_time.toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            }),
            location: concert.location || "Địa điểm tổ chức sự kiện",
          };

          await this.notificationService.sendNotification(
            order.user_id,
            "CONCERT_REMINDER",
            order.user.email,
            variables,
          );
        }
      }
      this.logger.log("Upcoming concert reminders check completed.");
    } catch (error) {
      this.logger.error("Error running upcoming concert reminders check:", error);
    }
  }
}
