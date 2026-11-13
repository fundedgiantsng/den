import { Controller, Post, Body, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RequestOtpDto, RetryWhatsappOtpDto, VerifyOtpDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
