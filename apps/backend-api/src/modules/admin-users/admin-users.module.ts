import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminUsersService } from './services/admin-users.service';

@Module({
    controllers: [AdminUsersController],
    providers: [AdminUsersService, PrismaService],
    exports: [AdminUsersService],
})
export class AdminUsersModule { }
