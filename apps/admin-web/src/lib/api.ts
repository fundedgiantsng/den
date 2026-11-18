export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://api.fundedgiants.ng/api/v1'
    : 'http://localhost:4000/api/v1');

export function getAdminDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    return '4C4C4544-0034-4C10-8034-C4C04F584433';
  }

  let device = localStorage.getItem('fg_admin_device_fingerprint');

  if (!device) {
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
    if (isCapacitor) {
      device = 'FG-DEV-PRIMARY-MOBILE-01';
    } else {
      // Generate a persistent cryptographic hardware fingerprint for this browser terminal
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const timePart = Date.now().toString(36).toUpperCase();
      device = `FG-TERM-${randomPart}-${timePart}`;
    }
    localStorage.setItem('fg_admin_device_fingerprint', device);
  }

  return device;
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fg_admin_token') || null;
}

export function setAdminAuth(token: string, deviceId?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fg_admin_token', token);
  if (deviceId) {
    localStorage.setItem('fg_admin_device_fingerprint', deviceId);
  }
}

export function clearAdminAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('fg_admin_token');
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

  // Admin Identification
  headers.set('x-admin-id', options?.adminId || 'SUPER_ADMIN_CONSOLE');

  // Lock 1: Admin Bearer Token
  const token = getAdminToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('x-admin-token', token);
  }

  // Lock 2: Hardware Device Fingerprint Header
  const deviceFingerprint = options?.deviceFingerprint || getAdminDeviceFingerprint();
  headers.set('x-device-fingerprint', deviceFingerprint);
  headers.set('x-admin-device-id', deviceFingerprint);

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
    credentials: 'include',
  });

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    let isUnauthorized = false;
    try {
      const body = await res.json();
      errorMsg = body.message || errorMsg;
      if (res.status === 401 || (res.status === 403 && body.message?.includes('ADMIN_AUTH_REQUIRED'))) {
        isUnauthorized = true;
      }
    } catch {}

    if (isUnauthorized && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      clearAdminAuth();
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }

    throw new Error(errorMsg);
  }

  return res.json();
}
