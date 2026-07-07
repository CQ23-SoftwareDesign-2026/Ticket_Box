import { Module } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma.service";
import { EmailService } from "../../shared/email.service";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { NotificationSchedulerService } from "./notification-scheduler.service";

@Module({
  controllers: [NotificationController],
  providers: [
    PrismaService,
    EmailService,
    NotificationService,
    NotificationSchedulerService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
