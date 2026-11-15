import { Controller, Post, Get, Body, HttpCode, HttpStatus, Res, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RequestOtpDto, RetryWhatsappOtpDto, VerifyOtpDto, SignupDto, NinjaBvnVerifyDto } from './dto/auth.dto';

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
        firstName: user.firstName,
        lastName: user.lastName,
        address: user.address,
        role: user.role,
        kycStatus: user.kycStatus,
        wallet: user.wallet,
        affiliateProfile: user.affiliateProfile,
      },
    };
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
    let user = token ? await this.authService.getSessionUser(token) : null;
    let userId = user?.id || req.user?.id;
    if (!userId && dto.email) {
      const u = await this.authService.findUserByEmail(dto.email);
      userId = u?.id;
    }
    if (!userId) {
      throw new UnauthorizedException('User identification required for KYC');
    }
    return this.authService.verifyNinjaBvn({ userId, bvn: dto.bvn });
  }
}
