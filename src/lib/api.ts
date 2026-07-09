// src/lib/api.ts
// Typed fetch wrapper — injects auth token, handles errors uniformly.
// All methods return { data: T } so callers can use const { data } = await api.get<Foo>(...)
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let _token: string | null = null;

export function setApiToken(token: string | null) {
  _token = token;
}

async function request<T = Record<string, any>>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>,
): Promise<{ data: T }> {
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

  return { data: await res.json() as T };
}

export const api = {
  get:    <T = Record<string, any>>(path: string, params?: Record<string, string | number | undefined>) =>
            request<T>('GET', path, undefined, params),
  post:   <T = Record<string, any>>(path: string, body?: unknown) => request<T>('POST', path, body),
  put:    <T = Record<string, any>>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch:  <T = Record<string, any>>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T = Record<string, any>>(path: string)                 => request<T>('DELETE', path),
};
