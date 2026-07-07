import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateTemplateDto {
  @ApiProperty({ example: "NEW_TEMPLATE" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  code!: string;

  @ApiProperty({ example: "EMAIL" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  channel!: string;

  @ApiProperty({ example: "Subject Line" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  subject!: string;

  @ApiProperty({ example: "Content Body html/text" })
  @IsNotEmpty()
  @IsString()
  content!: string;
}
