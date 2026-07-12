import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiConflictResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { NotificationService } from "./notification.service";
import { QueryNotificationLogsDto } from "./dtos/query-notification-logs.dto";
import { NotificationLogDto } from "./dtos/notification-log.dto";
import { NotificationTemplateDto } from "./dtos/notification-template.dto";
import { CreateTemplateDto } from "./dtos/create-template.dto";
import { UpdateTemplateDto } from "./dtos/update-template.dto";

@Controller("admin/notifications")
@ApiTags("Admin Notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get("logs")
  @ApiOperation({ summary: "Get all notification delivery logs (paginated)" })
  @ApiOkResponse({ description: "List of logs successfully retrieved" })
  async getLogs(@Query() query: QueryNotificationLogsDto) {
    return this.notificationService.getLogs(query);
  }

  @Get("logs/:id")
  @ApiOperation({ summary: "Get a notification log detail" })
  @ApiOkResponse({ type: NotificationLogDto })
  @ApiNotFoundResponse({ description: "Notification log not found" })
  async getLogDetail(@Param("id") id: string) {
    return this.notificationService.getLogDetail(id);
  }

  @Get("templates")
  @ApiOperation({ summary: "Get all notification templates" })
  @ApiOkResponse({ type: [NotificationTemplateDto] })
  async getTemplates() {
    return this.notificationService.getTemplates();
  }

  @Post("templates")
  @ApiOperation({ summary: "Create a new notification template" })
  @ApiOkResponse({ type: NotificationTemplateDto })
  @ApiConflictResponse({ description: "Template code already exists" })
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.notificationService.createTemplate(dto);
  }

  @Get("templates/:id")
  @ApiOperation({ summary: "Get a notification template detail" })
  @ApiOkResponse({ type: NotificationTemplateDto })
  @ApiNotFoundResponse({ description: "Template not found" })
  async getTemplateDetail(@Param("id") id: string) {
    return this.notificationService.getTemplateDetail(id);
  }

  @Patch("templates/:id")
  @ApiOperation({ summary: "Update an existing notification template" })
  @ApiOkResponse({ type: NotificationTemplateDto })
  @ApiNotFoundResponse({ description: "Template not found" })
  async updateTemplate(@Param("id") id: string, @Body() dto: UpdateTemplateDto) {
    return this.notificationService.updateTemplate(id, dto);
  }

  @Delete("templates/:id")
  @ApiOperation({ summary: "Delete a notification template" })
  @ApiOkResponse({ description: "Template successfully deleted" })
  @ApiNotFoundResponse({ description: "Template not found" })
  async deleteTemplate(@Param("id") id: string) {
    return this.notificationService.deleteTemplate(id);
  }
}
