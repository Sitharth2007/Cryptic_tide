/**
 * Central API client – attaches Supabase access token from session.
 * All calls go to the FastAPI backend.
 */
import { supabase } from './supabaseClient';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function apiFetch(path, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  // Handle CSV / blob downloads
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) return res.blob();

  return res.json();
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
};
