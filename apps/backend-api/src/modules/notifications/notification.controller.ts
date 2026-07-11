import { Controller, Get, Param, Patch, Query, Req, Sse, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Observable } from "rxjs";
import { MessageEvent } from "@nestjs/common";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { NotificationService } from "./notification.service";
import { NotificationStreamService } from "./notification-stream.service";

@Controller("notifications")
@ApiTags("Notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly stream: NotificationStreamService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's notifications" })
  list(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("unreadOnly") unreadOnly?: string,
  ) {
    return this.notifications.list(
      req.user.sub,
      Number(page) || 1,
      Number(limit) || 20,
      unreadOnly === "true",
    );
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get the current user's unread notification count" })
  unreadCount(@Req() req: any) {
    return this.notifications.unreadCount(req.user.sub);
  }

  @Sse("stream")
  @ApiOperation({ summary: "Stream new notifications for the current user" })
  connect(@Req() req: any): Observable<MessageEvent> {
    return this.stream.connect(req.user.sub);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all current user's notifications as read" })
  markAllRead(@Req() req: any) {
    return this.notifications.markAllRead(req.user.sub);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark one current user's notification as read" })
  markRead(@Req() req: any, @Param("id") id: string) {
    return this.notifications.markRead(req.user.sub, id);
  }
}
