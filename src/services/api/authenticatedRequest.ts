import { ApiError, apiRequest } from "./httpClient";
import { withTranslationLanguageHeader } from "../../i18n/translationLocale";
import {
  refreshSessionAccessToken,
  refreshSessionCookie,
  resolveSessionAccessToken
} from "../auth/sessionRuntime";

export interface AuthenticatedRequestOptions extends RequestInit {
  timeoutMs?: number;
}

function localizedOptions(
  options: AuthenticatedRequestOptions,
  token: string | null
): AuthenticatedRequestOptions & { token: string | null } {
  return {
    ...options,
    headers: withTranslationLanguageHeader(options.headers),
    token,
    credentials: "include"
  };
}

export async function authenticatedRequest<T>(
  path: string,
  options: AuthenticatedRequestOptions = {},
  fallbackAccessToken?: string | null
): Promise<T> {
  const token = await resolveSessionAccessToken(fallbackAccessToken);

  try {
    return await apiRequest<T>(path, localizedOptions(options, token));
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    const refreshedToken = token ? await refreshSessionAccessToken() : null;
    const cookieRefreshed = refreshedToken
      ? false
      : await refreshSessionCookie();
    if (!refreshedToken && !cookieRefreshed) throw error;
    return apiRequest<T>(path, localizedOptions(options, refreshedToken));
  }
}
