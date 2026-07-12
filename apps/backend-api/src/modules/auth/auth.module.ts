import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { PrismaService } from '../../shared/prisma.service';
import { EmailService } from '../../shared/email.service';
import { RedisModule } from '../../shared/redis/redis.module';
import { AuthLoginRateLimitGuard } from './guards/auth-login-rate-limit.guard';

@Module({
  imports: [RedisModule],
  controllers: [AuthController],
  providers: [PrismaService, AuthService, EmailService, AuthLoginRateLimitGuard],
  exports: [AuthService],
})
export class AuthModule {}
