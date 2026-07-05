import { Module } from '@nestjs/common';
import { ConcertRepository } from './repositories/concert.repository';
import { PrismaService } from '../../shared/prisma.service';
import { ConcertService } from './services/concert.service';
import { ConcertController } from './controllers/concert.controller';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RedisModule } from '../../shared/redis/redis.module';
import { TicketingModule } from '../ticketing/ticketing.module';

@Module({
  imports: [RedisModule, TicketingModule],
  providers: [PrismaService, ConcertRepository, ConcertService, RolesGuard],
  controllers: [ConcertController],
  exports: [ConcertRepository, ConcertService],
})
export class CatalogModule { }
