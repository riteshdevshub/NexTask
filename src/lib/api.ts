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
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
