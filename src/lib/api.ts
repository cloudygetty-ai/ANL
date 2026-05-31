// src/lib/api.ts
// Typed fetch wrapper — injects auth token, handles errors uniformly
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let _token: string | null = null;

export function setApiToken(token: string | null) {
  _token = token;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error ?? res.statusText), { status: res.status, body: err });
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string, params?: Record<string, string | number | undefined>) =>
            request<T>('GET', path, undefined, params),
  post:   <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string)                 => request<T>('DELETE', path),
};
