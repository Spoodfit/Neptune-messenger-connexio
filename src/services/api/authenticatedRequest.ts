import { ApiError, apiRequest } from "./httpClient";
import {
  refreshSessionAccessToken,
  resolveSessionAccessToken
} from "../auth/sessionRuntime";

export interface AuthenticatedRequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function authenticatedRequest<T>(
  path: string,
  options: AuthenticatedRequestOptions = {},
  fallbackAccessToken?: string | null
): Promise<T> {
  const token = await resolveSessionAccessToken(fallbackAccessToken);

  try {
    return await apiRequest<T>(path, {
      ...options,
      token,
      credentials: "include"
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !token) {
      throw error;
    }
    const refreshedToken = await refreshSessionAccessToken();
    if (!refreshedToken) throw error;
    return apiRequest<T>(path, {
      ...options,
      token: refreshedToken,
      credentials: "include"
    });
  }
}
