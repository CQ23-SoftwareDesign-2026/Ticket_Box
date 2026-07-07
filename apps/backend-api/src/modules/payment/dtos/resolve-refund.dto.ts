import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ResolveRefundDto {
  @ApiPropertyOptional({ example: "REF123456" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  refund_tx_id?: string;

  @ApiPropertyOptional({ example: "Refunded via bank transfer because user paid after expiration" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  refund_note?: string;
}
