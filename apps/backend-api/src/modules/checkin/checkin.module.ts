import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CheckInController } from './controllers/checkin.controller';
import { CheckInService } from './services/checkin.service';
import { CheckerAssignmentController } from './controllers/checker-assignment.controller';
import { CheckerAssignmentService } from './services/checker-assignment.service';

@Module({
    controllers: [CheckInController, CheckerAssignmentController],
    providers: [CheckInService, CheckerAssignmentService, PrismaService],
    exports: [CheckInService, CheckerAssignmentService],
})
export class CheckInModule { }
