import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO representing a ticket tier (maps to TicketCategory in Prisma schema)
 */
export class TicketTierDto {
  @ApiProperty({ example: 'f6c2a9c4-0e88-4b7c-8b9d-2e93c1c5c1b1' })
  id!: string;

  @ApiProperty({ example: 'SVIP' })
  name!: string;

  @ApiProperty({ example: 5000000 })
  price!: number;

  @ApiProperty({ example: 200 })
  total_quantity!: number;

  @ApiProperty({ example: 2 })
  max_per_user!: number;

  @ApiProperty({ example: 1, required: false })
  gate_number?: number | null;

  constructor(partial: Partial<TicketTierDto> = {}) {
    Object.assign(this, partial);
  }
}
