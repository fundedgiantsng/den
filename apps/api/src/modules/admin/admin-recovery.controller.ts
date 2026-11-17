import {
  Controller,
  Post,
  Get,
  Patch,
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
import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';
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

  @IsString()
  @IsOptional()
  @IsIn(['PERMANENT', 'TEMPORARY'])
  mode?: 'PERMANENT' | 'TEMPORARY';
}

@Controller('admin/auth')
export class AdminRecoveryController {
  private readonly logger = new Logger(AdminRecoveryController.name);

  // Recommended Master Key Pattern: FG-SEC-RECOVERY-<RANDOM_HEX>-MASTER-OVERRIDE
  private readonly defaultMasterKey = 'FG-SEC-RECOVERY-8849-2026-X9B2-MASTER-OVERRIDE';

  @Post('emergency-recovery')
  @HttpCode(HttpStatus.OK)
  async emergencyRecovery(@Body() body: EmergencyRecoveryDto, @Req() req: any) {
    const configuredKey = process.env.ADMIN_EMERGENCY_RECOVERY_KEY || this.defaultMasterKey;
    const providedKey = (body.recoveryKey || '').trim();

    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const configuredBuf = Buffer.from(configuredKey);
    const providedBuf = Buffer.from(providedKey);

    const isMatch =
      configuredBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(configuredBuf, providedBuf);

    if (!isMatch) {
      this.logger.error(`Failed emergency recovery attempt from IP=${clientIp}, UserAgent=${userAgent}`);

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

    this.logger.log(
      `Emergency hardware authorization GRANTED [${mode}]: ${newFingerprint} (${deviceLabel}) from ${clientIp}`
    );

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
            mode,
            expiresAt,
            authorizedAt: new Date().toISOString(),
          },
        },
      });
    } catch {}

    const adminSessionToken = `fg_adm_${crypto.randomBytes(24).toString('hex')}`;

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
