type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

function getBaseUrl(): string {
  const useTor = String(import.meta.env.VITE_USE_TOR || '').toLowerCase() === 'true';
  const apiBase = String(import.meta.env.VITE_API_BASE || '').trim();
  const torBase = String(import.meta.env.VITE_TOR_BASE || '').trim();
  return useTor && torBase ? torBase : apiBase;
}

export async function apiGet<T = Json>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, { ...(init || {}), method: 'GET' });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T = Json>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...(init || {}),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = { get: apiGet, post: apiPost };

