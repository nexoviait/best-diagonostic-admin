import { ApiError, extractFieldErrors } from './errors';

const BASE_URL = '/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mediadmin_token');
}

export function setToken(token: string) {
  localStorage.setItem('mediadmin_token', token);
}

export function clearToken() {
  localStorage.removeItem('mediadmin_token');
  localStorage.removeItem('mediadmin_user');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('mediadmin_user');
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    // Corrupt data — clear it and force re-login
    localStorage.removeItem('mediadmin_user');
    return null;
  }
}

export function setUser(user: any) {
  localStorage.setItem('mediadmin_user', JSON.stringify(user));
}

// Shared in-flight refresh promise so concurrent 401s trigger a single
// /auth/refresh call instead of a stampede that races the JWT blacklist.
let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const token = getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn('[auth] token refresh rejected by server, status:', response.status);
        return null;
      }

      const data = await response.json();
      if (data?.access_token) {
        setToken(data.access_token);
        return data.access_token as string;
      }
      return null;
    } catch (err) {
      console.warn('[auth] token refresh request failed:', err);
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function forceLogout(reason: string) {
  console.warn('[auth] forcing logout:', reason);
  clearToken();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Do not set Content-Type header if sending FormData (browser sets it automatically with boundary)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    // fetch() itself throws (TypeError) when there's no response at all —
    // offline, DNS failure, server unreachable, CORS block, etc. This is
    // NOT a validation/auth error, so it gets its own dedicated code rather
    // than falling through to the generic 'unknown' bucket.
    console.error('[api] network failure calling', path, networkError);
    throw new ApiError('Network request failed.', 0, {}, 'network');
  }

  try {
    if (response.status === 401) {
      // No token at all means this wasn't an authenticated request to begin
      // with (e.g. a failed login attempt) — surface the normal credentials
      // error instead of trying to "refresh" a session that never existed.
      if (!token) {
        throw new ApiError('Invalid username/email or password.', 401, {}, 'invalid_credentials');
      }

      // A 401 with a token present can mean the access token merely expired
      // (normal, expected during a long session) rather than the session
      // actually being invalidated. Try one silent refresh-and-retry before
      // giving up — only force a logout if this request is itself already
      // a post-refresh retry, or the refresh attempt failed.
      if (_isRetry) {
        forceLogout('retry after refresh still unauthorized');
        throw new ApiError('Unauthorized', 401, {}, 'session_expired');
      }

      const newToken = await refreshToken();
      if (!newToken) {
        forceLogout('refresh token failed or expired');
        throw new ApiError('Unauthorized', 401, {}, 'session_expired');
      }

      return apiRequest<T>(path, options, true);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const fields = extractFieldErrors(errorData);
      const message =
        errorData?.message || errorData?.error || Object.values(fields)[0] || 'API Request Failed';

      let code: ApiError['code'] = 'unknown';
      if (response.status === 403) code = 'forbidden';
      else if (response.status === 404) code = 'not_found';
      else if (response.status === 422 || response.status === 400) code = 'validation';
      else if (response.status === 429) code = 'rate_limited';
      else if (response.status >= 500) code = 'server';

      console.error(`[api] ${options.method || 'GET'} ${path} -> ${response.status}`, errorData);
      throw new ApiError(message, response.status, fields, code);
    }

    return response.json();
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error('API Error:', error);
    }
    throw error;
  }
}
