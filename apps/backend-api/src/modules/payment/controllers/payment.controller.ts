import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Patch,
    Param,
    Req,
    UsePipes,
    UseInterceptors,
    ValidationPipe,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiCreatedResponse,
    ApiHeader,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { PaymentService } from '../services/payment.service';
import { ResolveRefundDto } from '../dtos/resolve-refund.dto';
import { PaymentProcessResponseDto } from '../dtos/payment-process-response.dto';
import { PaymentWebhookRequestDto } from '../dtos/payment-webhook-request.dto';
import { PaymentWebhookResponseDto } from '../dtos/payment-webhook-response.dto';
import { PaymentIdempotencyInterceptor } from '../interceptors/payment-idempotency.interceptor';

@Controller('payments')
@ApiTags('Payments')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('process')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(PaymentIdempotencyInterceptor)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Process a payment request' })
    @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID v4 idempotency key for duplicate prevention' })
    @ApiCreatedResponse({ type: PaymentProcessResponseDto })
    @ApiBadRequestResponse({ description: 'Validation failed or missing idempotency key' })
    @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
    async processPayment(
        @Req() req: any,
        @Body() dto: CreatePaymentDto,
    ) {
        return this.paymentService.processPayment(req.user.sub, dto, req.paymentTracking?.idempotencyKey);
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Handle payment provider webhook callback' })
    @ApiBody({ type: PaymentWebhookRequestDto })
    @ApiCreatedResponse({ type: PaymentWebhookResponseDto })
    @ApiBadRequestResponse({ description: 'Validation failed or signature mismatch' })
    async handleWebhook(
        @Body() dto: any,
    ) {
        return this.paymentService.handleWebhook(dto);
    }

    @Patch('transactions/:id/refund')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Resolve and record a refund for paid-after-expiration/cancelled payments' })
    async resolveRefund(
        @Param('id') id: string,
        @Req() req: any,
        @Body() dto: ResolveRefundDto,
    ) {
        return this.paymentService.resolveRefund(id, req.user.sub, dto);
    }
}