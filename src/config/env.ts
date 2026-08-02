import Constants from "expo-constants";

interface AppExtra {
  apiBaseUrl?: string;
  realtimeUrl?: string;
  businessWebBaseUrl?: string;
  mockMode?: boolean;
  eas?: {
    projectId?: string;
  };
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

export const env = {
  apiBaseUrl: extra.apiBaseUrl ?? "",
  realtimeUrl: extra.realtimeUrl ?? "",
  businessWebBaseUrl:
    extra.businessWebBaseUrl ?? "https://neptunebusiness.com",
  mockMode: extra.mockMode === true,
  easProjectId: extra.eas?.projectId ?? Constants.easConfig?.projectId ?? ""
} as const;
