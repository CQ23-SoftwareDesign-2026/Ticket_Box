import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: "EMAIL" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  channel?: string;

  @ApiPropertyOptional({ example: "Updated Subject Line" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiPropertyOptional({ example: "Updated HTML/Text Content" })
  @IsOptional()
  @IsString()
  content?: string;
}
