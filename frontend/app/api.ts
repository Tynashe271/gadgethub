export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export type ApiError = { error?: string; message?: string };

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("gh_token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(10_000),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiError;
    throw new Error(body.message || body.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? undefined as T : response.json();
}
