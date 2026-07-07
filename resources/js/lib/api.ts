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

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
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

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      clearToken();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      throw new Error('Invalid username/email or password.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'API Request Failed');
    }

    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
