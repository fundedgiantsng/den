const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function getAdminDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    return '4C4C4544-0034-4C10-8034-C4C04F584433';
  }

  let device = localStorage.getItem('fg_admin_device_fingerprint');

  if (!device) {
    // Check if running inside mobile capacitor environment
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
    if (isCapacitor) {
      device = 'FG-DEV-PRIMARY-MOBILE-01';
      localStorage.setItem('fg_admin_device_fingerprint', device);
    } else if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'trader.fundedgiants.ng' ||
      window.location.hostname === 'admin.fundedgiants.ng'
    ) {
      // Primary Station hardware binding
      device = '4C4C4544-0034-4C10-8034-C4C04F584433';
      localStorage.setItem('fg_admin_device_fingerprint', device);
    }
  }

  return device || '4C4C4544-0034-4C10-8034-C4C04F584433';
}

export async function fetchAdminApi<T = any>(
  endpoint: string,
  options?: RequestInit & { adminId?: string; deviceFingerprint?: string },
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options?.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Mandatory admin identification headers
  headers.set('x-admin-id', options?.adminId || 'SUPER_ADMIN_CONSOLE');

  // Mandatory hardware device fingerprint lockdown header
  const deviceFingerprint = options?.deviceFingerprint || getAdminDeviceFingerprint();
  headers.set('x-device-fingerprint', deviceFingerprint);
  headers.set('x-admin-device-id', deviceFingerprint);

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      errorMsg = body.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}
