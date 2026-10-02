/**
 * Central API client — attaches custom JWT from localStorage.
 * Completely replaces Supabase session-based auth.
 * All calls go to the FastAPI backend.
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = 'cryptictide_token';

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export async function apiFetch(path, options = {}) {
  const token = getStoredToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Allow callers to override/extend headers (e.g. for unauthenticated calls)
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}

    // If 401 — token was invalidated (another device logged in, or expired)
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      // Let the app handle redirect by triggering a storage event
      window.dispatchEvent(new Event('auth:invalidated'));
    }

    throw new Error(detail);
  }

  // Handle CSV / blob downloads
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) return res.blob();

  return res.json();
}

export const api = {
  get:    (path, opts = {}) => apiFetch(path, { method: 'GET', ...opts }),
  post:   (path, body, opts = {}) => apiFetch(path, { method: 'POST', body: JSON.stringify(body), ...opts }),
  put:    (path, body, opts = {}) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  delete: (path, opts = {}) => apiFetch(path, { method: 'DELETE', ...opts }),
};
