import { Body, Controller, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { ReserveTicketDto, InitCategoryDto } from '../dtos/reserve-ticket.dto';
import { TicketingService } from '../services/ticketing.service';
import { TicketReserveRateLimitGuard } from '../guards/ticket-reserve-rate-limit.guard';

@Controller('tickets')
@ApiTags('Tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TicketingController {
    constructor(private readonly ticketingService: TicketingService) { }

    @Post('reserve')
    @UseGuards(TicketReserveRateLimitGuard)
    @ApiOperation({ summary: 'Reserve ticket in memory atomically' })
    async reserveTicket(@Req() req: any, @Body() dto: ReserveTicketDto) {
        return this.ticketingService.reserveTicket(req.user.sub, dto);
    }

    @Post('init')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Initialize ticket category in Redis (For testing/seeding)' })
    async initCategory(
        @Body() dto: InitCategoryDto
    ) {
        await this.ticketingService.seedCategoryInventory(dto.category_id, dto.available, dto.max_per_user);
        return { status: 'SUCCESS', message: 'Category inventory initialized' };
    }
}
