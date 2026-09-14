// app/utils/apiClient.ts
import type { ApiError } from '@/types';

const DEFAULT_API_URL = 'http://localhost:4000/api/v1';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

export class ApiException extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('gh_token') : null;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(10_000),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiError;
      throw new ApiException(
        response.status,
        body.message || body.error || `Request failed (${response.status})`,
        body
      );
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  } catch (error) {
    if (error instanceof ApiException) throw error;
    throw new ApiException(
      0,
      error instanceof Error ? error.message : 'Unknown error',
      error
    );
  }
}
