import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class LogUserDto {
  @ApiProperty({ example: "John Doe" })
  full_name!: string;

  @ApiProperty({ example: "john@example.com" })
  email!: string;
}

class LogTemplateDto {
  @ApiProperty({ example: "TICKET_CONFIRMATION" })
  code!: string;

  @ApiProperty({ example: "EMAIL" })
  channel!: string;

  @ApiProperty({ example: "Your e-ticket is ready" })
  subject!: string;
}

export class NotificationLogDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id!: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  user_id!: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  template_id!: string;

  @ApiProperty({ example: "john@example.com" })
  target!: string;

  @ApiProperty({ example: "SENT" })
  status!: string;

  @ApiPropertyOptional({ example: "SMTP connection timeout" })
  error_message?: string | null;

  @ApiProperty({ example: 0 })
  retry_count!: number;

  @ApiProperty({ format: "date-time" })
  created_at!: Date;

  @ApiPropertyOptional({ format: "date-time" })
  sent_at?: Date | null;

  @ApiPropertyOptional({ type: LogUserDto })
  user?: LogUserDto;

  @ApiPropertyOptional({ type: LogTemplateDto })
  template?: LogTemplateDto;

  constructor(partial: Partial<NotificationLogDto> = {}) {
    Object.assign(this, partial);
  }
}
