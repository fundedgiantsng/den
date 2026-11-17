import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DeviceBindingGuard } from './device-binding.guard';
import { prisma } from '@fundedgiants/database';
import * as crypto from 'crypto';

export class EmergencyRecoveryDto {
  @IsString()
  @IsNotEmpty()
  recoveryKey!: string;

  @IsString()
  @IsOptional()
  deviceLabel?: string;
}

@Controller('admin/auth')
export class AdminRecoveryController {
  private readonly logger = new Logger(AdminRecoveryController.name);

  // Fallback production default recovery key if not explicitly provided in environment
  private readonly defaultMasterKey = 'FG-SEC-RECOVERY-8849-2026-X9B2-MASTER-OVERRIDE';

  @Post('emergency-recovery')
  @HttpCode(HttpStatus.OK)
  async emergencyRecovery(@Body() body: EmergencyRecoveryDto, @Req() req: any) {
    const configuredKey = process.env.ADMIN_EMERGENCY_RECOVERY_KEY || this.defaultMasterKey;
    const providedKey = (body.recoveryKey || '').trim();

    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Constant-time comparison to prevent timing side-channel attacks
    const configuredBuf = Buffer.from(configuredKey);
    const providedBuf = Buffer.from(providedKey);

    const isMatch =
      configuredBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(configuredBuf, providedBuf);

    if (!isMatch) {
      this.logger.error(
        `Failed emergency recovery attempt from IP=${clientIp}, UserAgent=${userAgent}`
      );

      try {
        await prisma.auditEvent.create({
          data: {
            action: 'EMERGENCY_RECOVERY_FAILED',
            resource: 'ADMIN_HARDWARE_LOCKDOWN',
            ipAddress: clientIp,
            userAgent: userAgent,
            details: {
              reason: 'Invalid cryptographic master recovery key supplied.',
              attemptedAt: new Date().toISOString(),
            },
          },
        });
      } catch {}

      throw new ForbiddenException(
        'INVALID_RECOVERY_KEY: The supplied emergency master recovery key is incorrect. Access denied.'
      );
    }

    // Generate authorized device fingerprint for this replacement hardware
    const timestampPart = Date.now().toString(36).toUpperCase();
    const entropyPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    const newFingerprint = `FG-DEV-RECOVERY-${timestampPart}-${entropyPart}`;
    const deviceLabel = (body.deviceLabel || '').trim() || `Emergency Replacement Device (${new Date().toLocaleDateString()})`;

    // Register into active authorized hardware registry
    DeviceBindingGuard.addAuthorizedDevice({
      id: newFingerprint,
      label: deviceLabel,
      authorizedAt: new Date().toISOString(),
      authorizedIp: clientIp,
      userAgent: userAgent,
      status: 'ACTIVE',
    });

    this.logger.log(
      `Emergency hardware authorization GRANTED: ${newFingerprint} (${deviceLabel}) from ${clientIp}`
    );

    // Audit trail log
    try {
      await prisma.auditEvent.create({
        data: {
          action: 'EMERGENCY_DEVICE_RECOVERY_ACTIVATED',
          resource: 'ADMIN_HARDWARE_LOCKDOWN',
          resourceId: newFingerprint,
          ipAddress: clientIp,
          userAgent: userAgent,
          details: {
            deviceFingerprint: newFingerprint,
            deviceLabel: deviceLabel,
            authorizedAt: new Date().toISOString(),
          },
        },
      });
    } catch (auditErr) {
      this.logger.error('Failed to write audit event for recovery:', auditErr);
    }

    // Return administrative unlock token & hardware fingerprint
    const adminSessionToken = `fg_adm_${crypto.randomBytes(24).toString('hex')}`;

    return {
      success: true,
      message: 'Master recovery verified. Hardware device successfully authorized for admin control panel.',
      deviceFingerprint: newFingerprint,
      deviceLabel: deviceLabel,
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
