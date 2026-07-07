import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../shared/dtos/pagination.dto";

export class QueryNotificationLogsDto extends PaginationDto {
  @ApiPropertyOptional({ example: "SENT" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "TICKET_CONFIRMATION" })
  @IsOptional()
  @IsString()
  template_code?: string;

  @ApiPropertyOptional({ example: "john@example.com" })
  @IsOptional()
  @IsString()
  search?: string;
}
