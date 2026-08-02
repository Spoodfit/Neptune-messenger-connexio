import type { SessionApi } from "./contracts";
import { apiRequest } from "./httpClient";
import {
  normalizeAppUser,
  normalizeSessionPayload
} from "./wire";
import type { AppUser, SessionPayload } from "../../types/messaging";

function unwrapUser(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const record = payload as Record<string, unknown>;
  if (record.user) return record.user;
  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    return data.user ?? data;
  }
  return payload;
}

export class NeptuneSessionApi implements SessionApi {
  async loginWithCredentials(email: string, password: string): Promise<AppUser> {
    const payload = await apiRequest<unknown>("/v1/auth/login", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
    return normalizeAppUser(unwrapUser(payload));
  }

  async getCurrentUser(): Promise<AppUser> {
    const payload = await apiRequest<unknown>("/v1/auth/me", {
      credentials: "include"
    });
    return normalizeAppUser(unwrapUser(payload));
  }

  async logoutCookieSession(): Promise<void> {
    await apiRequest("/v1/auth/logout", {
      method: "POST",
      credentials: "include"
    });
  }

  async exchangeOneTimeCode(
    code: string,
    deviceId: string
  ): Promise<SessionPayload> {
    const payload = await apiRequest<unknown>("/v1/mobile/session/exchange", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        one_time_code: code,
        device_id: deviceId
      })
    });
    return normalizeSessionPayload(payload);
  }

  async refreshSession(refreshToken: string): Promise<SessionPayload> {
    const payload = await apiRequest<unknown>("/v1/mobile/session/refresh", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    return normalizeSessionPayload(payload);
  }

  async revokeSession(refreshToken: string): Promise<void> {
    await apiRequest("/v1/mobile/session/revoke", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  }
}
