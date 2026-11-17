import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface AuthorizedDeviceRecord {
  id: string;
  label: string;
  authorizedAt: string;
  authorizedIp?: string;
  userAgent?: string;
  status: 'ACTIVE' | 'REVOKED';
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
        authorizedAt: '2026-01-01T00:00:00.000Z',
        status: 'ACTIVE',
      },
      {
        id: DeviceBindingGuard.PRIMARY_MOBILE_ID,
        label: 'Primary Smartphone (FundedGiants Admin Android App)',
        authorizedAt: '2026-01-01T00:00:00.000Z',
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
            if (item && item.id && !list.some((d) => d.id === item.id)) {
              list.push(item);
            }
          }
        }
      }
    } catch (err) {
      // Ignore file read error, fallback to built-in primary devices
    }

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

  public static revokeDevice(deviceId: string): boolean {
    if (deviceId === DeviceBindingGuard.PRIMARY_HARDWARE_ID || deviceId === DeviceBindingGuard.PRIMARY_MOBILE_ID) {
      return false;
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

    const activeDevices = DeviceBindingGuard.getAuthorizedDevices().filter((d) => d.status === 'ACTIVE');
    const isAuthorizedHardware = activeDevices.some((d) => d.id === clientHardwareId);

    if (isAuthorizedHardware) {
      return true;
    }

    const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';
    if (isLoopback) {
      return true;
    }

    this.logger.warn(
      `Hardware Lockdown: Access blocked from untrusted device: IP=${clientIp}, DeviceHeader=${clientHardwareId}`
    );

    throw new ForbiddenException(
      'DEVICE_LOCKDOWN_ACTIVE: Access restricted to authorized hardware (Primary Laptop & Primary Admin App). If your primary device was lost or replaced, use the private Emergency Recovery Portal to authorize a replacement hardware device.'
    );
  }
}
