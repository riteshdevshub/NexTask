const TOKEN_KEY = 'nextask_access_token';
const REFRESH_KEY = 'nextask_refresh_token';

export const tokenStorage = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  setAccess: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (token: string) => localStorage.setItem(REFRESH_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.getAccess();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(endpoint, {
    ...options,
    headers,
  });

  // Handle token expiration: try refresh once
  if (response.status === 401 && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/refresh') {
    const refreshToken = tokenStorage.getRefresh();
    if (refreshToken) {
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const tokens = await refreshRes.json();
          tokenStorage.setAccess(tokens.accessToken);
          if (tokens.refreshToken) tokenStorage.setRefresh(tokens.refreshToken);

          // Retry original request
          headers.set('Authorization', `Bearer ${tokens.accessToken}`);
          response = await fetch(endpoint, {
            ...options,
            headers,
          });
        } else {
          tokenStorage.clear();
        }
      } catch {
        tokenStorage.clear();
      }
    } else {
      tokenStorage.clear();
    }
  }

  // If /api/auth/me failed with 401 or 404, clear any stale tokens from other devices
  if (endpoint === '/api/auth/me' && (response.status === 401 || response.status === 404)) {
    tokenStorage.clear();
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // If it's a 404, handle gracefully without crashing or throwing "The requested item was not found" toast
    if (response.status === 404) {
      console.warn(`[API 404 Handled] ${endpoint}: Resource not found, returning graceful fallback.`);
      return (data || { notFound: true, message: 'Resource processed' }) as T;
    }

    const errorMsg =
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
