import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { AdminRevenueController } from './controllers/admin-revenue.controller';
import { AdminRevenueService } from './services/admin-revenue.service';

@Module({
    controllers: [AdminRevenueController],
    providers: [AdminRevenueService, PrismaService],
    exports: [AdminRevenueService],
})
export class AdminRevenueModule { }
