import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CatalogModule } from './modules/catalog/catalog.module';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RedisModule } from './shared/redis/redis.module';
import { RabbitMqModule } from './shared/rabbitmq';
import { TicketingModule } from './modules/ticketing/ticketing.module';
import { UploadModule } from './modules/upload/upload.module';
import { WorkerModule } from './modules/worker/worker.module';
import { CheckInModule } from './modules/checkin/checkin.module';

@Module({
	imports: [
		ScheduleModule.forRoot(),
		RedisModule,
		RabbitMqModule,
		CatalogModule,
		AuthModule,
		PaymentModule,
		TicketingModule,
		UploadModule,
		WorkerModule,
		CheckInModule,
	],
})
export class AppModule { }
