import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
  public static readonly PRIMARY_HARDWARE_ID = '4C4C4544-0034-4C10-8034-C4C04F584433';
  public static readonly PRIMARY_MOBILE_ID = 'FG-DEV-PRIMARY-MOBILE-01';

  private static getStoragePath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'data'),
      path.resolve(process.cwd(), '../data'),
      path.resolve(__dirname, '../../../../data'),
      '/var/www/fundedgiants/data',
    ];
    let dataDir = candidates[0];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        dataDir = c;
        break;
      }
    }
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
      return false;
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

  public static signAdminToken(payload: { username: string; role: string; deviceId: string; exp: number }): string {
    const secret = process.env.JWT_SECRET || 'fg_secure_admin_jwt_secret_key_production_2026';
    const jsonStr = JSON.stringify(payload);
    const b64 = Buffer.from(jsonStr).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(b64).digest('hex');
    return `${b64}.${sig}`;
  }

  public static verifyAdminToken(token: string): { username: string; role: string; deviceId: string; exp: number } | null {
    try {
      if (!token || !token.includes('.')) return null;
      const [b64, sig] = token.split('.');
      const secret = process.env.JWT_SECRET || 'fg_secure_admin_jwt_secret_key_production_2026';
      const expectedSig = crypto.createHmac('sha256', secret).update(b64).digest('hex');

      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expectedSig);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp < Date.now()) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const reqPath = request.path || request.url || '';

    // Public auth / recovery routes are bypassed from the dual-lock
    if (
      reqPath.includes('/admin/auth/login') ||
      reqPath.includes('/admin/auth/emergency-recovery')
    ) {
      return true;
    }

    // 1. Lock 2: Hardware Device Binding Check
    const clientHardwareId =
      request.headers['x-device-fingerprint'] ||
      request.headers['x-admin-device-id'] ||
      request.cookies?.['fg_admin_device_id'];
    const clientIp = request.ip || request.connection?.remoteAddress;

    const allDevices = DeviceBindingGuard.getAuthorizedDevices();
    const matched = allDevices.find((d) => d.id === clientHardwareId);

    if (!matched) {
      this.logger.warn(
        `Hardware Lockdown: Blocked from unauthorized terminal: IP=${clientIp}, Device=${clientHardwareId || 'NONE'}`
      );
      throw new ForbiddenException(
        'DEVICE_LOCKDOWN_ACTIVE: Access restricted to authorized hardware. If accessing from a new device, bind this terminal with the Admin Master Key.'
      );
    }

    if (matched.status === 'PAUSED') {
      throw new ForbiddenException(
        'DEVICE_ACCESS_PAUSED: This hardware device is paused. Resume access in Admin Settings.'
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

    // 2. Lock 1: Admin Credentials Session Token Check
    let token = '';
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (request.headers['x-admin-token']) {
      token = String(request.headers['x-admin-token']).trim();
    } else if (request.cookies?.['fg_admin_token']) {
      token = String(request.cookies['fg_admin_token']).trim();
    }

    if (!token) {
      throw new UnauthorizedException('ADMIN_AUTH_REQUIRED: Please sign in with administrator credentials.');
    }

    const payload = DeviceBindingGuard.verifyAdminToken(token);
    if (!payload) {
      throw new UnauthorizedException('ADMIN_SESSION_EXPIRED: Session invalid or expired. Please sign in again.');
    }

    request.admin = payload;
    return true;
  }
}
