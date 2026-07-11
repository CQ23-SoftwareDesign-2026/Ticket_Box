import { Module } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service";
import { EmailService } from "../../shared/email.service";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { NotificationStreamService } from "./notification-stream.service";
import { EmailNotificationChannel } from "./channels/email-notification.channel";
import { InAppNotificationChannel } from "./channels/in-app-notification.channel";
import { NOTIFICATION_CHANNELS } from "./notification.types";
import { NotificationSchedulerService } from "./notification-scheduler.service";
import { EmailNotificationConsumer } from "./consumers/email-notification.consumer";

@Module({
  controllers: [NotificationController],
  providers: [
    PrismaService,
    EmailService,
    NotificationService,
    NotificationStreamService,
    EmailNotificationChannel,
    InAppNotificationChannel,
    NotificationSchedulerService,
    EmailNotificationConsumer,
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (inApp: InAppNotificationChannel, email: EmailNotificationChannel) => [inApp, email],
      inject: [InAppNotificationChannel, EmailNotificationChannel],
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
