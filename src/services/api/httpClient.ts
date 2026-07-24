import { env } from "@/config/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown
  ) {
    super(message);
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!env.apiBaseUrl) {
    throw new ApiError("EXPO_PUBLIC_API_BASE_URL manquante.", 0);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.token
        ? { Authorization: `Bearer ${options.token}` }
        : {}),
      ...options.headers
    }
  });

  const payload = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new ApiError(
      `Erreur API ${response.status}`,
      response.status,
      payload
    );
  }

  return payload as T;
}
