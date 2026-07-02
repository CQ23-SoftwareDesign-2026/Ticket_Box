import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminDashboardService } from './services/admin-dashboard.service';

@Module({
    controllers: [AdminDashboardController],
    providers: [AdminDashboardService, PrismaService],
    exports: [AdminDashboardService],
})
export class AdminDashboardModule { }
