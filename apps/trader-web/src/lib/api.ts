/**
 * Central API Configuration for FundedGiants Trader Web
 * Production: https://api.fundedgiants.ng/api/v1
 */
export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'https://api.fundedgiants.ng/api/v1').replace(/\/+$/, '');

export function getApiUrl(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (clean.startsWith('/api/v1')) {
    const withoutPrefix = clean.replace('/api/v1', '');
    return `${API_BASE_URL}${withoutPrefix}`;
  }
  return `${API_BASE_URL}${clean}`;
}
