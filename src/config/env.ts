import Constants from "expo-constants";

interface AppExtra {
  apiBaseUrl?: string;
  realtimeUrl?: string;
  businessWebBaseUrl?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  accountDeletionUrl?: string;
  supportUrl?: string;
  mockMode?: boolean;
  coworkingEnabled?: boolean;
  standaloneMode?: boolean;
  buildProfile?: string;
  backendContract?: "neptune-web-v1" | "connexio-v1";
  releaseStage?: "development" | "preview" | "standalone" | "release-candidate" | "production";
  eas?: {
    projectId?: string;
  };
}

const PUBLIC_POLICY_BASE_URL =
  "https://spoodfit.github.io/Neptune-messenger-connexio";
const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;
const standaloneMode =
  extra.standaloneMode === true || extra.buildProfile === "standalone";

export const env = {
  apiBaseUrl: extra.apiBaseUrl ?? "",
  realtimeUrl: extra.realtimeUrl ?? "",
  businessWebBaseUrl:
    extra.businessWebBaseUrl ?? "https://neptunebusiness.com",
  privacyPolicyUrl:
    extra.privacyPolicyUrl ?? `${PUBLIC_POLICY_BASE_URL}/privacy-policy.html`,
  termsUrl:
    extra.termsUrl ?? `${PUBLIC_POLICY_BASE_URL}/connexio-terms.html`,
  accountDeletionUrl:
    extra.accountDeletionUrl ?? `${PUBLIC_POLICY_BASE_URL}/account-deletion.html`,
  supportUrl: extra.supportUrl ?? "mailto:contact@neptunebusiness.com",
  standaloneMode,
  mockMode: extra.mockMode === true || standaloneMode,
  coworkingEnabled:
    extra.coworkingEnabled === true ||
    process.env.EXPO_PUBLIC_COWORKING_ENABLED === "true",
  buildProfile: extra.buildProfile ?? "development",
  backendContract: extra.backendContract ?? "neptune-web-v1",
  releaseStage: extra.releaseStage ?? "development",
  easProjectId: extra.eas?.projectId ?? Constants.easConfig?.projectId ?? ""
} as const;
