import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Hardware & Device Isolation Guard
 * Ensures only authorized administrative hardware can mutate sensitive system configuration / .env
 */
@Injectable()
export class DeviceBindingGuard implements CanActivate {
  private readonly logger = new Logger(DeviceBindingGuard.name);

  // Authoritative Primary Device Hardware Identifier
  // Automatically bound to the current development and administrative station
  private readonly primaryHardwareId = '4C4C4544-0034-4C10-8034-C4C04F584433';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientHardwareId = request.headers['x-device-fingerprint'];
    const clientIp = request.ip || request.connection?.remoteAddress;

    // Allow localhost loopback requests originating directly from the primary machine
    const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';

    if (isLoopback) {
      return true;
    }

    if (!clientHardwareId || clientHardwareId !== this.primaryHardwareId) {
      this.logger.warn(
        `Unauthorized configuration attempt blocked from untrusted device: IP=${clientIp}, DeviceHeader=${clientHardwareId}`
      );
      throw new ForbiddenException(
        'Access Denied: Environment and system configurations can only be updated from the verified primary bound device.'
      );
    }

    return true;
  }
}
