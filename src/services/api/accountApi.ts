import type { AppUser } from "../../types/messaging";
import { authenticatedRequest } from "./authenticatedRequest";

export interface AccountSession {
  id: string;
  deviceName: string;
  platform: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
  approximateLocation?: string;
}

export interface NotificationPreferences {
  messages: boolean;
  mentions: boolean;
  groups: boolean;
  highlights: boolean;
  calls: boolean;
  confidentialPreview: boolean;
}

export interface PrivacyPreferences {
  mapVisibility: "visible" | "ghost";
  profileVisibility: "members" | "connections";
  phoneVisible: boolean;
  presenceVisible: boolean;
  approximateLocationEnabled: boolean;
}

export class NeptuneAccountApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  listSessions(): Promise<AccountSession[]> {
    return authenticatedRequest<AccountSession[]>(
      "/v1/account/sessions",
      {},
      this.fallbackAccessToken
    );
  }

  async revokeSession(sessionId: string): Promise<void> {
    await authenticatedRequest(
      `/v1/account/sessions/${encodeURIComponent(sessionId)}`,
      { method: "DELETE" },
      this.fallbackAccessToken
    );
  }

  requestDataExport(): Promise<{ downloadUrl: string; expiresAt: string }> {
    return authenticatedRequest(
      "/v1/account/export",
      { method: "POST" },
      this.fallbackAccessToken
    );
  }

  resyncProfile(): Promise<AppUser> {
    return authenticatedRequest(
      "/v1/account/resync",
      { method: "POST" },
      this.fallbackAccessToken
    );
  }

  async requestAccountDeletion(): Promise<void> {
    await authenticatedRequest(
      "/v1/account/deletion",
      { method: "POST" },
      this.fallbackAccessToken
    );
  }

  getNotificationPreferences(): Promise<NotificationPreferences> {
    return authenticatedRequest(
      "/v1/me/notification-preferences",
      {},
      this.fallbackAccessToken
    );
  }

  updateNotificationPreferences(
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences> {
    return authenticatedRequest(
      "/v1/me/notification-preferences",
      {
        method: "PUT",
        body: JSON.stringify(preferences)
      },
      this.fallbackAccessToken
    );
  }

  getPrivacyPreferences(): Promise<PrivacyPreferences> {
    return authenticatedRequest(
      "/v1/me/privacy-preferences",
      {},
      this.fallbackAccessToken
    );
  }

  updatePrivacyPreferences(
    preferences: PrivacyPreferences
  ): Promise<PrivacyPreferences> {
    return authenticatedRequest(
      "/v1/me/privacy-preferences",
      {
        method: "PUT",
        body: JSON.stringify(preferences)
      },
      this.fallbackAccessToken
    );
  }

  listBlockedMembers(): Promise<AppUser[]> {
    return authenticatedRequest(
      "/v1/me/blocked-users",
      {},
      this.fallbackAccessToken
    );
  }

  async unblockMember(memberId: string): Promise<void> {
    await authenticatedRequest(
      `/v1/me/blocked-users/${encodeURIComponent(memberId)}`,
      { method: "DELETE" },
      this.fallbackAccessToken
    );
  }
}
