import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UnauthorizedException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';
import { DeviceBindingGuard } from './device-binding.guard';
import { prisma } from '@fundedgiants/database';
import * as crypto from 'crypto';

export class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  deviceFingerprint!: string;

  @IsString()
  @IsOptional()
  deviceLabel?: string;

  @IsString()
  @IsOptional()
  masterKey?: string;
}

export class EmergencyRecoveryDto {
  @IsString()
  @IsNotEmpty()
  recoveryKey!: string;

  @IsString()
  @IsOptional()
  deviceLabel?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PERMANENT', 'TEMPORARY'])
  mode?: 'PERMANENT' | 'TEMPORARY';
}

@Controller('admin/auth')
export class AdminRecoveryController {
  private readonly logger = new Logger(AdminRecoveryController.name);

  private readonly defaultMasterKey = 'FG-SEC-RECOVERY-8849-2026-X9B2-MASTER-OVERRIDE';

  /**
   * Dual-Lock Admin Login
   * Lock 1: Admin username & password
   * Lock 2: Hardware Device Binding (can be bound with masterKey if new device)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() body: AdminLoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 1. Lock 1: Verify Admin Username and Password
    const configuredUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    const configuredPassword = (process.env.ADMIN_PASSWORD || 'fg_admin_2026_GiantVault#9').trim();

    const inputUser = (body.username || '').trim();
    const inputPass = (body.password || '').trim();

    let isValidCreds = false;
    if (inputUser.toLowerCase() === configuredUsername.toLowerCase() && inputPass === configuredPassword) {
      isValidCreds = true;
    } else {
      // Check database User table for admin role
      try {
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [{ username: inputUser }, { email: inputUser }],
            role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          },
        });
        if (dbUser && inputPass === configuredPassword) {
          isValidCreds = true;
        }
      } catch {}
    }

    if (!isValidCreds) {
      this.logger.warn(`Failed admin login attempt: user=${inputUser}, IP=${clientIp}`);
      throw new UnauthorizedException('Invalid administrator credentials.');
    }

    // 2. Lock 2: Verify Hardware Device Binding
    const deviceId = (body.deviceFingerprint || '').trim();
    if (!deviceId) {
      throw new ForbiddenException('DEVICE_FINGERPRINT_REQUIRED: Terminal hardware identifier missing.');
    }

    const allDevices = DeviceBindingGuard.getAuthorizedDevices();
    let matchedDevice = allDevices.find((d) => d.id === deviceId);

    // If device is not recognized, check if Master Key was provided to bind it
    if (!matchedDevice) {
      const configuredMasterKey = process.env.ADMIN_EMERGENCY_RECOVERY_KEY || this.defaultMasterKey;
      const providedMasterKey = (body.masterKey || '').trim();

      const confBuf = Buffer.from(configuredMasterKey);
      const provBuf = Buffer.from(providedMasterKey);
      const isMasterKeyMatch =
        confBuf.length > 0 &&
        confBuf.length === provBuf.length &&
        crypto.timingSafeEqual(confBuf, provBuf);

      if (isMasterKeyMatch) {
        // Authorize and bind this new terminal permanently
        const label = (body.deviceLabel || '').trim() || `Admin Terminal (${new Date().toLocaleDateString()})`;
        DeviceBindingGuard.addAuthorizedDevice({
          id: deviceId,
          label,
          mode: 'PERMANENT',
          authorizedAt: new Date().toISOString(),
          authorizedIp: clientIp,
          userAgent,
          status: 'ACTIVE',
        });
        matchedDevice = DeviceBindingGuard.getAuthorizedDevices().find((d) => d.id === deviceId);

        try {
          await prisma.auditEvent.create({
            data: {
              action: 'ADMIN_DEVICE_BOUND_ON_LOGIN',
              resource: 'ADMIN_HARDWARE_LOCKDOWN',
              resourceId: deviceId,
              ipAddress: clientIp,
              userAgent,
              details: { deviceId, label, boundAt: new Date().toISOString() },
            },
          });
        } catch {}

        this.logger.log(`New hardware terminal bound successfully during login: ${deviceId} (${label})`);
      } else {
        // Device not authorized and valid master key not supplied
        throw new ForbiddenException(
          'UNAUTHORIZED_DEVICE: This terminal is not a registered administrator device. Please supply the Admin Master Key to bind this terminal.'
        );
      }
    }

    if (matchedDevice && matchedDevice.status === 'PAUSED') {
      throw new ForbiddenException('DEVICE_ACCESS_PAUSED: This hardware device is currently paused.');
    }

    if (matchedDevice && matchedDevice.status === 'REVOKED') {
      throw new ForbiddenException('DEVICE_REVOKED: This hardware device has been revoked.');
    }

    // 3. Issue Dual-Lock Admin Token (valid for 24 hours)
    const tokenPayload = {
      username: inputUser,
      role: 'SUPER_ADMIN',
      deviceId,
      exp: Date.now() + 24 * 3600 * 1000,
    };
    const adminToken = DeviceBindingGuard.signAdminToken(tokenPayload);

    // Set secure HttpOnly cookie
    res.cookie('fg_admin_token', adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 3600 * 1000,
      path: '/',
    });
    res.cookie('fg_admin_device_id', deviceId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 3600 * 1000,
      path: '/',
    });

    try {
      await prisma.auditEvent.create({
        data: {
          action: 'ADMIN_LOGIN_SUCCESS',
          resource: 'ADMIN_CONTROL_PANEL',
          resourceId: inputUser,
          ipAddress: clientIp,
          userAgent,
          details: { username: inputUser, deviceId, authorizedAt: new Date().toISOString() },
        },
      });
    } catch {}

    return {
      success: true,
      message: 'Dual-lock authentication successful. Welcome, Administrator.',
      token: adminToken,
      deviceFingerprint: deviceId,
      admin: {
        username: inputUser,
        role: 'SUPER_ADMIN',
        boundDevice: matchedDevice?.label || deviceId,
      },
    };
  }

  /**
   * Check Current Admin Session & Hardware Status
   */
  @Get('me')
  @UseGuards(DeviceBindingGuard)
  getMe(@Req() req: any) {
    const admin = req.admin || { username: 'admin', role: 'SUPER_ADMIN' };
    const deviceId =
      req.headers['x-device-fingerprint'] ||
      req.headers['x-admin-device-id'] ||
      req.cookies?.['fg_admin_device_id'];
    const matched = DeviceBindingGuard.getAuthorizedDevices().find((d) => d.id === deviceId);

    return {
      authenticated: true,
      admin,
      device: matched || { id: deviceId, status: 'ACTIVE', label: 'Primary Station' },
    };
  }

  /**
   * Admin Logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('fg_admin_token', { path: '/' });
    return {
      success: true,
      message: 'Administrator session securely terminated.',
    };
  }

  /**
   * Emergency Master Recovery
   */
  @Post('emergency-recovery')
  @HttpCode(HttpStatus.OK)
  async emergencyRecovery(@Body() body: EmergencyRecoveryDto, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const configuredKey = process.env.ADMIN_EMERGENCY_RECOVERY_KEY || this.defaultMasterKey;
    const providedKey = (body.recoveryKey || '').trim();

    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const configuredBuf = Buffer.from(configuredKey);
    const providedBuf = Buffer.from(providedKey);

    const isMatch =
      configuredBuf.length > 0 &&
      configuredBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(configuredBuf, providedBuf);

    if (!isMatch) {
      this.logger.error(`Failed emergency recovery attempt from IP=${clientIp}, UserAgent=${userAgent}`);
      throw new ForbiddenException(
        'INVALID_RECOVERY_KEY: The supplied emergency master recovery key is incorrect. Access denied.'
      );
    }

    const mode = body.mode || 'PERMANENT';
    const timestampPart = Date.now().toString(36).toUpperCase();
    const entropyPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    const newFingerprint = `FG-DEV-${mode === 'TEMPORARY' ? 'TEMP' : 'REC'}-${timestampPart}-${entropyPart}`;
    const deviceLabel =
      (body.deviceLabel || '').trim() ||
      (mode === 'TEMPORARY'
        ? `Temporary Emergency Session (24h - ${new Date().toLocaleDateString()})`
        : `Emergency Replacement Device (${new Date().toLocaleDateString()})`);

    const expiresAt = mode === 'TEMPORARY' ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null;

    DeviceBindingGuard.addAuthorizedDevice({
      id: newFingerprint,
      label: deviceLabel,
      mode,
      authorizedAt: new Date().toISOString(),
      expiresAt,
      authorizedIp: clientIp,
      userAgent: userAgent,
      status: 'ACTIVE',
    });

    const adminSessionToken = DeviceBindingGuard.signAdminToken({
      username: 'emergency_admin',
      role: 'SUPER_ADMIN',
      deviceId: newFingerprint,
      exp: Date.now() + (mode === 'TEMPORARY' ? 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000),
    });

    res.cookie('fg_admin_token', adminSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 3600 * 1000,
      path: '/',
    });
    res.cookie('fg_admin_device_id', newFingerprint, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 3600 * 1000,
      path: '/',
    });

    return {
      success: true,
      message:
        mode === 'TEMPORARY'
          ? 'Emergency pass active for 24 hours. Hardware not permanently bound.'
          : 'Master recovery verified. Hardware device permanently authorized.',
      deviceFingerprint: newFingerprint,
      deviceLabel: deviceLabel,
      mode,
      expiresAt,
      token: adminSessionToken,
      authorizedAt: new Date().toISOString(),
    };
  }

  @Get('authorized-devices')
  @UseGuards(DeviceBindingGuard)
  getAuthorizedDevices() {
    return {
      success: true,
      devices: DeviceBindingGuard.getAuthorizedDevices(),
    };
  }

  @Patch('authorized-devices/:id/status')
  @UseGuards(DeviceBindingGuard)
  async toggleDeviceStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'PAUSED' },
    @Req() req: any
  ) {
    const success = DeviceBindingGuard.setDeviceStatus(id, body.status);
    if (!success) {
      throw new ForbiddenException('Cannot modify status of primary hardware terminal or device not found.');
    }

    try {
      await prisma.auditEvent.create({
        data: {
          action: `ADMIN_DEVICE_${body.status}`,
          resource: 'ADMIN_HARDWARE_LOCKDOWN',
          resourceId: id,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'],
          details: { deviceId: id, newStatus: body.status },
        },
      });
    } catch {}

    return {
      success: true,
      message: `Device ${id} status updated to ${body.status}.`,
    };
  }

  @Delete('authorized-devices/:id')
  @UseGuards(DeviceBindingGuard)
  async revokeDevice(@Param('id') id: string, @Req() req: any) {
    const revoked = DeviceBindingGuard.revokeDevice(id);
    if (!revoked) {
      throw new ForbiddenException('Cannot revoke primary workstation or device not found.');
    }

    try {
      await prisma.auditEvent.create({
        data: {
          action: 'ADMIN_DEVICE_REVOKED',
          resource: 'ADMIN_HARDWARE_LOCKDOWN',
          resourceId: id,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'],
          details: { revokedDeviceId: id },
        },
      });
    } catch {}

    return {
      success: true,
      message: `Device ${id} successfully revoked.`,
    };
  }
}
