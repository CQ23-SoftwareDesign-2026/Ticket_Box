import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { AdminRevenueService } from '../services/admin-revenue.service';
import {
    RevenueByConcertQueryDto,
    RevenueRangeQueryDto,
    RevenueTrendQueryDto,
} from '../dtos/revenue-query.dto';

@Controller('admin/revenue')
@ApiTags('Admin Revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminRevenueController {
    constructor(private readonly revenueService: AdminRevenueService) { }

    @Get('trend')
    @ApiOperation({ summary: 'Get system revenue trend grouped by day, week, or month' })
    @ApiOkResponse({ description: 'System revenue trend data' })
    getTrend(@Query() query: RevenueTrendQueryDto) {
        return this.revenueService.getTrend(query);
    }

    @Get('by-concert')
    @ApiOperation({ summary: 'Get revenue metrics grouped by concert' })
    @ApiOkResponse({ description: 'Concert revenue list' })
    getByConcert(@Query() query: RevenueByConcertQueryDto) {
        return this.revenueService.getByConcert(query);
    }

    @Get('concerts/:concert_id/detail')
    @ApiOperation({ summary: 'Get revenue detail for one concert' })
    @ApiOkResponse({ description: 'Concert revenue detail' })
    getConcertDetail(
        @Param('concert_id', ParseUUIDPipe) concertId: string,
        @Query() query: RevenueRangeQueryDto,
    ) {
        return this.revenueService.getConcertDetail(concertId, query);
    }
}
