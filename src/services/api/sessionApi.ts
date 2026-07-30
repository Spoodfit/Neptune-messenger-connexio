import type { SessionApi } from "./contracts";
import { apiRequest } from "./httpClient";
import type { SessionPayload } from "../../types/messaging";

export class NeptuneSessionApi implements SessionApi {
  exchangeOneTimeCode(code: string, deviceId: string): Promise<SessionPayload> {
    return apiRequest<SessionPayload>("/v1/mobile/session/exchange", {
      method: "POST",
      body: JSON.stringify({
        one_time_code: code,
        device_id: deviceId
      })
    });
  }

  refreshSession(refreshToken: string): Promise<SessionPayload> {
    return apiRequest<SessionPayload>("/v1/mobile/session/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  }

  async revokeSession(refreshToken: string): Promise<void> {
    await apiRequest("/v1/mobile/session/revoke", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  }
}
