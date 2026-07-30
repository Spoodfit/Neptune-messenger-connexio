import type { SessionApi } from "./contracts";
import { apiRequest } from "./httpClient";
import { normalizeSessionPayload } from "./wire";
import type { SessionPayload } from "../../types/messaging";

export class NeptuneSessionApi implements SessionApi {
  async exchangeOneTimeCode(
    code: string,
    deviceId: string
  ): Promise<SessionPayload> {
    const payload = await apiRequest<unknown>("/v1/mobile/session/exchange", {
      method: "POST",
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
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    return normalizeSessionPayload(payload);
  }

  async revokeSession(refreshToken: string): Promise<void> {
    await apiRequest("/v1/mobile/session/revoke", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  }
}
