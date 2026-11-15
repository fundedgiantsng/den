const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function fetchAdminApi<T = any>(
  endpoint: string,
  options?: RequestInit & { adminId?: string },
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options?.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Mandatory admin identification headers
  headers.set('x-admin-id', options?.adminId || 'SUPER_ADMIN_CONSOLE');

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
