import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { RecentOrdersQueryDto, RevenueQueryDto } from '../dtos/dashboard-query.dto';

@Controller('admin/dashboard')
@ApiTags('Admin Dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminDashboardController {
    constructor(private readonly dashboardService: AdminDashboardService) { }

    @Get('summary')
    @ApiOperation({ summary: 'Get high-level admin dashboard metrics' })
    @ApiOkResponse({ description: 'Dashboard summary metrics' })
    getSummary() {
        return this.dashboardService.getSummary();
    }

    @Get('revenue')
    @ApiOperation({ summary: 'Get revenue chart data grouped by day, week, or month' })
    @ApiOkResponse({ description: 'Revenue chart data' })
    getRevenue(@Query() query: RevenueQueryDto) {
        return this.dashboardService.getRevenue(query);
    }

    @Get('recent-orders')
    @ApiOperation({ summary: 'Get recent orders for admin dashboard' })
    @ApiOkResponse({ description: 'Recent order list' })
    getRecentOrders(@Query() query: RecentOrdersQueryDto) {
        return this.dashboardService.getRecentOrders(query);
    }
}
