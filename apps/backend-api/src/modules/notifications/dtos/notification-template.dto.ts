import { ApiProperty } from "@nestjs/swagger";

export class NotificationTemplateDto {
  @ApiProperty({ example: "f1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a55" })
  id!: string;

  @ApiProperty({ example: "TICKET_CONFIRMATION" })
  code!: string;

  @ApiProperty({ example: "EMAIL" })
  channel!: string;

  @ApiProperty({ example: "Your e-ticket is ready" })
  subject!: string;

  @ApiProperty({ example: "Your e-ticket is attached to {{tickets_list}}" })
  content!: string;

  constructor(partial: Partial<NotificationTemplateDto> = {}) {
    Object.assign(this, partial);
  }
}
