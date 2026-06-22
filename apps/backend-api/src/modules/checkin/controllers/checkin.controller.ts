import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Permissions } from '../../../shared/decorators/permissions.decorator';
import { CheckInService } from '../services/checkin.service';
import { BulkSyncDto } from '../dtos/sync-tickets.dto';
import { ScanTicketDto } from '../dtos/scan-ticket.dto';

@Controller('checkin')
@ApiTags('Check-in')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CheckInController {
    constructor(private readonly checkInService: CheckInService) { }

    @Get('prefetch/:concert_id')
    @Permissions('SCAN_TICKET')
    @ApiOperation({ summary: 'Pre-fetch list of active ticket hashes for offline validation' })
    @ApiQuery({ name: 'gate_id', required: false, example: '1', description: 'The gate identifier to filter ticket categories (spec compliant)' })
    @ApiQuery({ name: 'gate_number', required: false, example: 1, description: 'The gate number to filter ticket categories (alias)' })
    async prefetchTickets(
        @Param('concert_id', new ParseUUIDPipe()) concertId: string,
        @Query('gate_id') gateId?: string,
        @Query('gate_number') gateNumber?: string,
    ): Promise<string[]> {
        const rawGate = gateId || gateNumber;
        if (!rawGate) {
            throw new BadRequestException('gate_id or gate_number query parameter is required');
        }
        if (!/^\d+$/.test(rawGate)) {
            throw new BadRequestException('Gate identifier must contain only digits');
        }
        const parsedGate = parseInt(rawGate, 10);
        return this.checkInService.prefetchTickets(concertId, parsedGate);
    }

    @Post('sync')
    @Permissions('SCAN_TICKET')
    @ApiOperation({ summary: 'Synchronize offline scanned ticket statuses to server' })
    async syncTickets(@Body() dto: BulkSyncDto) {
        return this.checkInService.syncTickets(dto.updates, dto.concert_id, dto.gate_id);
    }

    @Post('scan')
    @Permissions('SCAN_TICKET')
    @ApiOperation({ summary: 'Real-time online check-in scan for single ticket' })
    async scanTicket(@Req() req: any, @Body() dto: ScanTicketDto) {
        return this.checkInService.scanTicket(req.user.sub, dto);
    }
}
