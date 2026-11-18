import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface AuthorizedDeviceRecord {
  id: string;
  label: string;
  mode: 'PERMANENT' | 'TEMPORARY';
  authorizedAt: string;
  expiresAt?: string | null;
  authorizedIp?: string;
  userAgent?: string;
  status: 'ACTIVE' | 'PAUSED' | 'REVOKED';
}

@Injectable()
export class DeviceBindingGuard implements CanActivate {
  private readonly logger = new Logger(DeviceBindingGuard.name);

  // Authoritative Primary Device Hardware Identifiers
  // 1. Primary Workstation / Laptop
  public static readonly PRIMARY_HARDWARE_ID = '4C4C4544-0034-4C10-8034-C4C04F584433';
  // 2. Primary Mobile App (Capacitor / Android Admin App)
  public static readonly PRIMARY_MOBILE_ID = 'FG-DEV-PRIMARY-MOBILE-01';

  private static getStoragePath(): string {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    return path.join(dataDir, 'authorized_devices.json');
  }

  public static getAuthorizedDevices(): AuthorizedDeviceRecord[] {
    const list: AuthorizedDeviceRecord[] = [
      {
        id: DeviceBindingGuard.PRIMARY_HARDWARE_ID,
        label: 'Primary Workstation (Admin Laptop)',
        mode: 'PERMANENT',
        authorizedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: null,
        status: 'ACTIVE',
      },
      {
        id: DeviceBindingGuard.PRIMARY_MOBILE_ID,
        label: 'Primary Smartphone (FundedGiants Admin Android App)',
        mode: 'PERMANENT',
        authorizedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: null,
        status: 'ACTIVE',
      },
    ];

    try {
      const filePath = DeviceBindingGuard.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id) {
              const existingIdx = list.findIndex((d) => d.id === item.id);
              if (existingIdx >= 0) {
                list[existingIdx] = { ...list[existingIdx], ...item };
              } else {
                list.push(item);
              }
            }
          }
        }
      }
    } catch (err) {}

    return list;
  }

  public static addAuthorizedDevice(device: AuthorizedDeviceRecord): void {
    const devices = DeviceBindingGuard.getAuthorizedDevices();
    const existingIndex = devices.findIndex((d) => d.id === device.id);
    if (existingIndex >= 0) {
      devices[existingIndex] = device;
    } else {
      devices.push(device);
    }

    const toSave = devices.filter(
      (d) => d.id !== DeviceBindingGuard.PRIMARY_HARDWARE_ID && d.id !== DeviceBindingGuard.PRIMARY_MOBILE_ID
    );

    try {
      const filePath = DeviceBindingGuard.getStoragePath();
      fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf8');
    } catch (err) {}
  }

  public static setDeviceStatus(deviceId: string, status: 'ACTIVE' | 'PAUSED'): boolean {
    if (deviceId === DeviceBindingGuard.PRIMARY_HARDWARE_ID || deviceId === DeviceBindingGuard.PRIMARY_MOBILE_ID) {
      return false; // Cannot pause primary hardware
    }
    const devices = DeviceBindingGuard.getAuthorizedDevices();
    const target = devices.find((d) => d.id === deviceId);
    if (target) {
      target.status = status;
      const toSave = devices.filter(
        (d) => d.id !== DeviceBindingGuard.PRIMARY_HARDWARE_ID && d.id !== DeviceBindingGuard.PRIMARY_MOBILE_ID
      );
      try {
        const filePath = DeviceBindingGuard.getStoragePath();
        fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf8');
        return true;
      } catch {}
    }
    return false;
  }

  public static revokeDevice(deviceId: string): boolean {
    if (deviceId === DeviceBindingGuard.PRIMARY_HARDWARE_ID || deviceId === DeviceBindingGuard.PRIMARY_MOBILE_ID) {
      return false; // Cannot revoke core hardware
    }
    const devices = DeviceBindingGuard.getAuthorizedDevices();
    const target = devices.find((d) => d.id === deviceId);
    if (target) {
      target.status = 'REVOKED';
      const toSave = devices.filter(
        (d) => d.id !== DeviceBindingGuard.PRIMARY_HARDWARE_ID && d.id !== DeviceBindingGuard.PRIMARY_MOBILE_ID
      );
      try {
        const filePath = DeviceBindingGuard.getStoragePath();
        fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf8');
        return true;
      } catch {}
    }
    return false;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientHardwareId =
      request.headers['x-device-fingerprint'] ||
      request.headers['x-admin-device-id'] ||
      request.cookies?.['fg_admin_device_id'];
    const clientIp = request.ip || request.connection?.remoteAddress;

    const allDevices = DeviceBindingGuard.getAuthorizedDevices();
    const matched = allDevices.find((d) => d.id === clientHardwareId);

    if (matched) {
      if (matched.status === 'PAUSED') {
        throw new ForbiddenException(
          'DEVICE_ACCESS_PAUSED: This hardware device is currently paused by platform administrator. Resume access in Admin Settings.'
        );
      }

      if (matched.status === 'REVOKED') {
        throw new ForbiddenException(
          'DEVICE_REVOKED: This hardware device has been revoked and can no longer access the admin control panel.'
        );
      }

      if (matched.mode === 'TEMPORARY' && matched.expiresAt) {
        if (new Date(matched.expiresAt).getTime() < Date.now()) {
          throw new ForbiddenException(
            'TEMPORARY_PASS_EXPIRED: The 24-hour emergency recovery session for this terminal has expired.'
          );
        }
      }

      return true;
    }

    this.logger.warn(
      `Hardware Lockdown: Access blocked from unauthorized terminal: IP=${clientIp}, DeviceHeader=${clientHardwareId || 'NONE'}`
    );

    throw new ForbiddenException(
      'DEVICE_LOCKDOWN_ACTIVE: Access restricted to authorized hardware. If you have lost access to your primary devices, use the private Emergency Recovery portal.'
    );
  }
}
