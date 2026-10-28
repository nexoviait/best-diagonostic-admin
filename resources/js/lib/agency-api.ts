import { ApiError, extractFieldErrors } from './errors';

// Agency Portal has its own token (separate from the staff "mediadmin_token") and its own
// /api/agency/* endpoints — see config/auth.php's "agency" guard. Mirrors lib/api.ts, but a 401
// here must never touch the staff session. /login is the single entry point for both staff and
// agency credentials (see routes/login.tsx) — it just sends an agency to /agency-portal on success.
const BASE_URL = '/api';
const TOKEN_KEY = 'agency_portal_token';
const AGENCY_KEY = 'agency_portal_agency';
const LOGIN_PATH = '/login';

export function getAgencyToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAgencyToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAgencyToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AGENCY_KEY);
}

export function getAgency() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AGENCY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(AGENCY_KEY);
    return null;
  }
}

export function setAgency(agency: any) {
  localStorage.setItem(AGENCY_KEY, JSON.stringify(agency));
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAgencyToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const token = getAgencyToken();
    if (!token) return null;

    try {
      const response = await fetch(`${BASE_URL}/agency/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.access_token) {
        setAgencyToken(data.access_token);
        return data.access_token as string;
      }
      return null;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function forceAgencyLogout(reason: string) {
  console.warn('[agency-auth] forcing logout:', reason);
  clearAgencyToken();
  if (typeof window !== 'undefined' && window.location.pathname !== LOGIN_PATH) {
    window.location.href = LOGIN_PATH;
  }
}

export async function agencyApiRequest<T = any>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const token = getAgencyToken();

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkError) {
    console.error('[agency-api] network failure calling', path, networkError);
    throw new ApiError('Network request failed.', 0, {}, 'network');
  }

  if (response.status === 401) {
    if (!token) {
      throw new ApiError('Invalid username or password.', 401, {}, 'invalid_credentials');
    }
    if (_isRetry) {
      forceAgencyLogout('retry after refresh still unauthorized');
      throw new ApiError('Unauthorized', 401, {}, 'session_expired');
    }
    const newToken = await refreshAgencyToken();
    if (!newToken) {
      forceAgencyLogout('refresh token failed or expired');
      throw new ApiError('Unauthorized', 401, {}, 'session_expired');
    }
    return agencyApiRequest<T>(path, options, true);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const fields = extractFieldErrors(errorData);
    const message =
      errorData?.message || errorData?.error || Object.values(fields)[0] || 'Request failed';

    let code: ApiError['code'] = 'unknown';
    if (response.status === 403) code = 'forbidden';
    else if (response.status === 404) code = 'not_found';
    else if (response.status === 422 || response.status === 400) code = 'validation';
    else if (response.status === 429) code = 'rate_limited';
    else if (response.status >= 500) code = 'server';

    console.error(`[agency-api] ${options.method || 'GET'} ${path} -> ${response.status}`, errorData);
    throw new ApiError(message, response.status, fields, code);
  }

  return response.json();
}
