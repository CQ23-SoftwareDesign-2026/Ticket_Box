import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CheckInController } from './controllers/checkin.controller';
import { CheckInService } from './services/checkin.service';

@Module({
    controllers: [CheckInController],
    providers: [CheckInService, PrismaService],
    exports: [CheckInService],
})
export class CheckInModule { }
