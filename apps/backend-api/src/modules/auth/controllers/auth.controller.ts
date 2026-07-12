import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Redirect,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { ResendVerificationDto } from '../dtos/resend-verification.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { LoginResponseDto, RegisterResponseDto } from '../dtos/auth-response.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AuthLoginRateLimitGuard } from '../guards/auth-login-rate-limit.guard';

@Controller('auth')
@ApiTags('Authentication')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new audience account' })
  @ApiCreatedResponse({
    description: 'Account created successfully',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation failed or email already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthLoginRateLimitGuard)
  @ApiOperation({ summary: 'Login and receive access token' })
  @ApiOkResponse({
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('verify')
  @Redirect('http://localhost:3000', 302)
  @ApiOperation({ summary: 'Verify user email using activation token' })
  @ApiOkResponse({ description: 'Email successfully verified and redirected' })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return { url: frontendUrl };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiOkResponse({ description: 'New verification email sent successfully' })
  @ApiBadRequestResponse({ description: 'Account not found or already verified' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile (F5 recovery)' })
  @ApiOkResponse({ description: 'Profile successfully retrieved' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiBadRequestResponse({ description: 'Current password incorrect' })
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiOkResponse({ description: 'Reset link sent successfully via email' })
  @ApiBadRequestResponse({ description: 'Email not found' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiOkResponse({ description: 'Password reset successfully' })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiOkResponse({ description: 'New token pair generated' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiOkResponse({ description: 'Logout successful' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.sub);
  }
}

