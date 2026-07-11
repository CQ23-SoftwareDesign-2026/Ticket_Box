import { ApiPropertyOptional } from "@nestjs/swagger";
import { NotificationType } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { PaginationDto } from "../../../shared/dtos/pagination.dto";

export class AdminNotificationQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: "Filter by read state", example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  read?: boolean;

  @ApiPropertyOptional({
    description: "Search title, message, user name or email",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
