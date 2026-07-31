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
  if (!token) throw new ApiError("Session Neptune absente.", 401);

  try {
    return await apiRequest<T>(path, { ...options, token });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refreshedToken = await refreshSessionAccessToken();
    if (!refreshedToken) throw error;
    return apiRequest<T>(path, { ...options, token: refreshedToken });
  }
}
