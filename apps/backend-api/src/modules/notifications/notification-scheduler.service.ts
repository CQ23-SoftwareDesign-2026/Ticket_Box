import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../shared/prisma.service";
import { NotificationService } from "./notification.service";

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleConcertReminders(): Promise<void> {
    const now = new Date();
    const concerts = await this.prisma.concert.findMany({
      where: {
        start_time: {
          gt: now,
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        orders: {
          where: { status: "PAID" },
          include: { user: true },
        },
      },
    });

    for (const concert of concerts) {
      const users = new Map(concert.orders.map((order) => [order.user_id, order.user]));
      for (const user of users.values()) {
        const deduplicationKey = `concert-reminder:${concert.id}:${user.id}`;
        const alreadyCreated = await this.prisma.notification.findUnique({
          where: { deduplication_key: deduplicationKey },
          select: { id: true },
        });
        if (alreadyCreated) continue;
        await this.notifications.sendConcertReminder({
          userId: user.id,
          email: user.email,
          fullName: user.full_name,
          concertId: concert.id,
          concertName: concert.name,
          startTime: concert.start_time,
          location: concert.location,
        });
      }
    }
    this.logger.log(`Processed reminders for ${concerts.length} upcoming concert(s)`);
  }
}
