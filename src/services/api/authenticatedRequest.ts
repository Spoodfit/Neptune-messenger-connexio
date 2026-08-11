import { ApiError, apiRequest } from "./httpClient";
import {
  refreshSessionAccessToken,
  refreshSessionCookie,
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
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    const refreshedToken = token ? await refreshSessionAccessToken() : null;
    const cookieRefreshed = refreshedToken
      ? false
      : await refreshSessionCookie();
    if (!refreshedToken && !cookieRefreshed) throw error;
    return apiRequest<T>(path, {
      ...options,
      token: refreshedToken,
      credentials: "include"
    });
  }
}
