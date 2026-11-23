import { Controller, Post, Get, Put, Body, Query, HttpCode, HttpStatus, Res, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as crypto from 'crypto';
import { prisma } from '@fundedgiants/database';
import { AuthService } from './auth.service';
import { RequestOtpDto, RetryWhatsappOtpDto, VerifyOtpDto, SignupDto, NinjaBvnVerifyDto, UpdateProfileDto, SetUsernameDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a new trader or affiliate directly without prior account purchase' })
  @ApiResponse({ status: 200, description: 'Registration initiated, verification OTP sent to email' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request passwordless OTP via Email or Robase SMS' })
  @ApiResponse({ status: 200, description: 'OTP challenge initiated successfully' })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('retry-whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry OTP delivery via Robase WhatsApp if SMS did not arrive' })
  @ApiResponse({ status: 200, description: 'WhatsApp OTP dispatched successfully' })
  async retryWhatsapp(@Body() dto: RetryWhatsappOtpDto) {
    return this.authService.retryWhatsapp(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit OTP code and issue secure session cookie' })
  @ApiResponse({ status: 200, description: 'Authenticated successfully' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.verifyOtp(dto);

    // Set secure HttpOnly cookie for session token
    response.cookie('fg_session', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return {
      success: true,
      user: result.user,
      sessionToken: result.sessionToken,
    };
  }

  @Get('impersonate-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange impersonation token for HttpOnly session cookie' })
  async exchangeImpersonationSession(
    @Query('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!token) {
      throw new UnauthorizedException('Impersonation token required');
    }
    const user = await this.authService.getSessionUser(token);
    if (!user) {
      throw new UnauthorizedException('Impersonation session invalid or expired');
    }

    response.cookie('fg_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@Req() req: any) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }
    const user = await this.authService.getSessionUser(token);
    if (!user) {
      throw new UnauthorizedException('Session expired or invalid');
    }
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        address: user.address,
        role: user.role,
        kycStatus: user.kycStatus,
        wallet: user.wallet,
        affiliateProfile: user.affiliateProfile,
        kycRecord: (user as any).kycRecords?.[0] || null,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout trader and invalidate active session cookies' })
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) response: Response
  ) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (token) {
      try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await prisma.session.deleteMany({ where: { tokenHash } });
      } catch (e) {
        // Session already invalidated or deleted
      }
    }

    response.clearCookie('fg_session', { path: '/' });
    response.clearCookie('fg_admin_token', { path: '/' });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile (username, names, phone/whatsapp, address)' })
  async updateMe(@Body() dto: UpdateProfileDto, @Req() req: any) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }
    const user = await this.authService.getSessionUser(token);
    if (!user) {
      throw new UnauthorizedException('Session expired or invalid');
    }
    return this.authService.updateProfile(user.id, dto);
  }

  @Post('set-username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim and set custom username on first login or after WordPress purchase' })
  async setUsername(@Body() dto: SetUsernameDto, @Req() req: any) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }
    const user = await this.authService.getSessionUser(token);
    if (!user) {
      throw new UnauthorizedException('Session expired or invalid');
    }
    return this.authService.setUsername(user.id, dto.username);
  }

  @Post('ninja-bvn-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify BVN using NinjaKYC on first login' })
  @ApiResponse({ status: 200, description: 'NinjaKYC verified and dedicated account activated' })
  async verifyNinjaBvn(
    @Body() dto: NinjaBvnVerifyDto,
    @Req() req: any,
  ) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    const user = token ? await this.authService.getSessionUser(token) : null;
    const userId = user?.id || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required for KYC verification');
    }
    return this.authService.verifyNinjaBvn({ userId, bvn: dto.bvn });
  }

  @Post('ninja-hosted-kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate Ninja.ng Hosted KYC verification session' })
  @ApiResponse({ status: 200, description: 'Returns hosted verification URL' })
  async initiateNinjaHostedKyc(@Body() body: any, @Req() req: any) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    const user = token ? await this.authService.getSessionUser(token) : null;
    let userId = user?.id || req.user?.id || body?.userId;

    if (!userId && body?.email) {
      const userByEmail = await prisma.user.findUnique({ where: { email: body.email } });
      if (userByEmail) {
        userId = userByEmail.id;
      }
    }

    if (!userId) {
      throw new UnauthorizedException('Authentication required to start Ninja KYC');
    }
    return this.authService.initiateHostedKyc(userId);
  }

  @Post('ninja-sync-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync and verify Ninja KYC verification status with official Ninja API' })
  @ApiResponse({ status: 200, description: 'Returns synced KYC status and profile details' })
  async syncNinjaKycStatus(@Body() body: any, @Req() req: any) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    const user = token ? await this.authService.getSessionUser(token) : null;
    let userId = user?.id || req.user?.id || body?.userId;

    if (!userId && body?.email) {
      const userByEmail = await prisma.user.findUnique({ where: { email: body.email } });
      if (userByEmail) {
        userId = userByEmail.id;
      }
    }

    if (!userId) {
      throw new UnauthorizedException('Authentication required to sync Ninja KYC status');
    }

    const verificationId = body?.verificationId || body?.vs_id;
    return this.authService.syncNinjaKycStatus(userId, verificationId);
  }
}
