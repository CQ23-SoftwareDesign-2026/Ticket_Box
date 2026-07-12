import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../../shared/prisma.service';
import { EmailService } from '../../../shared/email.service';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { ResendVerificationDto } from '../dtos/resend-verification.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { Prisma } from '@prisma/client';

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = '15m'; // Access Token standard short expiry

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) { }

  // ─── HELPER: GENERATE ACCESS & REFRESH TOKENS ────────────────

  private async generateTokens(
    userId: string,
    email: string,
    fullName: string,
    roles: string[],
    permissions: string[],
  ) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const payload = {
      sub: userId,
      email,
      fullName,
      roles,
      permissions,
    };

    const accessToken = jwt.sign(payload, secret, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign({ sub: userId, email }, secret, {
      expiresIn: '7d',
    });

    // Hash and store the refresh token in the database
    const hashed = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refresh_token: hashed },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  // ─── REGISTER ────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    // 1. Check duplicate email
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // 3. Find the default "Audience" role
    const audienceRole = await this.prisma.role.findUnique({
      where: { name: 'Audience' },
    });
    if (!audienceRole) {
      throw new BadRequestException('Default role "Audience" not found. Please run database seed first.');
    }

    // 4. Create user + assign role in a transaction with PENDING status
    const user = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          password_hash: passwordHash,
          full_name: dto.fullName,
          status: 'PENDING',
        },
      });

      await tx.userRole.create({
        data: {
          user_id: newUser.id,
          role_id: audienceRole.id,
        },
      });

      return newUser;
    });

    // 5. Sign Email Verification JWT Token (Expires in 1 hour)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const verificationToken = jwt.sign(
      { email: user.email },
      secret,
      { expiresIn: '1h' },
    );

    // 6. Send verification email
    await this.emailService.sendVerificationEmail(user.email, user.full_name, verificationToken);

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      status: user.status,
      roles: ['Audience'],
    };
  }

  // ─── LOGIN ───────────────────────────────────────────────────

  async login(dto: LoginDto) {
    // 1. Find user with roles and permissions
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Block inactive/pending users
    if (user.status === 'PENDING') {
      throw new UnauthorizedException(
        'Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra hòm thư email để xác nhận kích hoạt tài khoản.',
      );
    }

    // 3. Verify password
    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Collect roles and permissions
    const roles = user.user_roles.map((ur: { role: { name: string } }) => ur.role.name);
    const permissions = [
      ...new Set(
        user.user_roles.flatMap((ur: { role: { role_permissions: Array<{ permission: { code: string } }> } }) =>
          ur.role.role_permissions.map((rp: { permission: { code: string } }) => rp.permission.code),
        ),
      ),
    ];

    // 5. Generate dynamic Access & Refresh Tokens
    const tokens = await this.generateTokens(user.id, user.email, user.full_name, roles, permissions);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        roles,
        permissions,
      },
    };
  }

  // ─── GET PROFILE (ME) ─────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                role_permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại.');
    }

    const roles = user.user_roles.map((ur: any) => ur.role.name);
    const permissions = [
      ...new Set(
        user.user_roles.flatMap((ur: any) =>
          ur.role.role_permissions.map((rp: any) => rp.permission.code),
        ),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      status: user.status,
      roles,
      permissions,
    };
  }

  // ─── VERIFY EMAIL ─────────────────────────────────────────────

  async verifyEmail(token: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    try {
      const decoded = jwt.verify(token, secret) as { email: string };
      const user = await this.prisma.user.findUnique({
        where: { email: decoded.email },
      });

      if (!user) {
        throw new BadRequestException('Tài khoản không tồn tại.');
      }

      if (user.status === 'ACTIVE') {
        return { message: 'Tài khoản đã được kích hoạt từ trước.' };
      }

      await this.prisma.user.update({
        where: { email: decoded.email },
        data: { status: 'ACTIVE' },
      });

      return { message: 'Kích hoạt tài khoản thành công! Bây giờ bạn có thể đăng nhập.' };
    } catch {
      throw new BadRequestException('Mã xác thực kích hoạt không hợp lệ hoặc đã hết hạn.');
    }
  }

  // ─── RESEND VERIFICATION ──────────────────────────────────────

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại.');
    }

    if (user.status === 'ACTIVE') {
      throw new BadRequestException('Tài khoản đã được kích hoạt từ trước.');
    }

    // Sign a new Email Verification JWT Token (Expires in 1 hour)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const verificationToken = jwt.sign(
      { email: user.email },
      secret,
      { expiresIn: '1h' },
    );

    // Send the email
    await this.emailService.sendVerificationEmail(user.email, user.full_name, verificationToken);

    return { message: 'Mã xác thực mới đã được gửi tới email của bạn. Vui lòng kiểm tra hòm thư.' };
  }

  // ─── CHANGE PASSWORD ──────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại.');
    }

    const passwordValid = await bcrypt.compare(dto.oldPassword, user.password_hash);
    if (!passwordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: passwordHash },
    });

    return { message: 'Đổi mật khẩu thành công!' };
  }

  // ─── FORGOT PASSWORD ──────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Tài khoản với email này không tồn tại.');
    }

    // Sign dynamic Reset Token using a combined secret of JWT_SECRET + password_hash
    const secret = process.env.JWT_SECRET + user.password_hash;
    const resetToken = jwt.sign(
      { email: user.email },
      secret,
      { expiresIn: '15m' }, // 15 minutes expiration
    );

    await this.emailService.sendPasswordResetEmail(user.email, user.full_name, resetToken);

    return { message: 'Yêu cầu khôi phục mật khẩu đã được gửi qua email. Vui lòng kiểm tra hòm thư.' };
  }

  // ─── RESET PASSWORD ───────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const decodedUnverified = jwt.decode(dto.token) as { email: string };
    if (!decodedUnverified || !decodedUnverified.email) {
      throw new BadRequestException('Mã khôi phục không hợp lệ.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: decodedUnverified.email },
    });

    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại.');
    }

    const secret = process.env.JWT_SECRET + user.password_hash;

    try {
      jwt.verify(dto.token, secret);
    } catch {
      throw new BadRequestException('Mã khôi phục đã hết hạn hoặc không hợp lệ.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        refresh_token: null, // Force logout everywhere
      },
    });

    return { message: 'Khôi phục mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.' };
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────────

  async refresh(dto: RefreshTokenDto) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    try {
      const decoded = jwt.verify(dto.refreshToken, secret) as { sub: string; email: string };
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: {
          user_roles: {
            include: {
              role: {
                include: {
                  role_permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Tài khoản không hợp lệ hoặc chưa được kích hoạt.');
      }

      if (!user.refresh_token) {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
      }

      const isRefreshTokenValid = await bcrypt.compare(dto.refreshToken, user.refresh_token);
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Mã Refresh Token không hợp lệ.');
      }

      const roles = user.user_roles.map((ur: { role: { name: string } }) => ur.role.name);
      const permissions = [
        ...new Set(
          user.user_roles.flatMap((ur: { role: { role_permissions: Array<{ permission: { code: string } }> } }) =>
            ur.role.role_permissions.map((rp: { permission: { code: string } }) => rp.permission.code),
          ),
        ),
      ];

      const tokens = await this.generateTokens(user.id, user.email, user.full_name, roles, permissions);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          roles,
          permissions,
        },
      };
    } catch {
      throw new UnauthorizedException('Mã Refresh Token đã hết hạn hoặc không hợp lệ.');
    }
  }

  // ─── LOGOUT ───────────────────────────────────────────────────

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refresh_token: null },
    });
    return { message: 'Đăng xuất thành công!' };
  }
}


