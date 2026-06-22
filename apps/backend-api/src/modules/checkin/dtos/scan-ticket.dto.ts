import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ScanTicketDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID of the concert' })
    @IsUUID()
    @IsNotEmpty()
    concert_id!: string;

    @ApiProperty({ example: 1, description: 'The gate identifier/number where the ticket is scanned' })
    @IsInt()
    @IsNotEmpty()
    gate_id!: number;

    @ApiProperty({ example: '855e4b7c8b9d2e93c1c5c1b12e93c1c5c1b1a716446655440000', description: 'Cryptographic hash of the QR code' })
    @IsString()
    @IsNotEmpty()
    qr_code_hash!: string;

    @ApiProperty({ example: '2026-06-17T10:00:00.000Z', required: false, description: 'ISO string of the scan time (defaults to server time)' })
    @IsDateString()
    @IsOptional()
    scanned_at?: string;
}
