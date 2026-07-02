import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsDateString, IsInt, IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncTicketItemDto {
    @ApiProperty({ example: '855e4b7c8b9d2e93c1c5c1b12e93c1c5c1b1a716446655440000', description: 'Cryptographic hash of the QR code' })
    @IsString()
    @IsNotEmpty()
    qr_code_hash!: string;

    @ApiProperty({ example: '2026-06-16T12:00:00.000Z', description: 'ISO string of the time scanned offline' })
    @IsDateString()
    @IsNotEmpty()
    scanned_at!: string;
}

export class BulkSyncDto {
    @ApiProperty({ type: [SyncTicketItemDto], description: 'List of offline scanned tickets to synchronize' })
    @IsArray()
    @ArrayMaxSize(1000)
    @ValidateNested({ each: true })
    @Type(() => SyncTicketItemDto)
    updates!: SyncTicketItemDto[];

    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Concert ID to scope the synchronization' })
    @IsUUID()
    @IsNotEmpty()
    concert_id!: string;

    @ApiProperty({ example: 1, description: 'Gate ID/number to scope the synchronization' })
    @IsInt()
    @IsNotEmpty()
    gate_id!: number;
}
