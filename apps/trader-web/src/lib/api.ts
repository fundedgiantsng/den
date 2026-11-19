/**
 * Central API Configuration for FundedGiants Trader Web
 * Automatically points to https://api.fundedgiants.ng/api/v1 in production
 * and http://localhost:4000/api/v1 in local development.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://api.fundedgiants.ng/api/v1'
    : 'http://localhost:4000/api/v1');

export function getApiUrl(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (clean.startsWith('/api/v1')) {
    const withoutPrefix = clean.replace('/api/v1', '');
    return `${API_BASE_URL}${withoutPrefix}`;
  }
  return `${API_BASE_URL}${clean}`;
}
