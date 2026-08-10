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
  buildProfile?: string;
  releaseStage?: "development" | "preview" | "release-candidate" | "production";
  eas?: {
    projectId?: string;
  };
}

const PUBLIC_POLICY_BASE_URL =
  "https://neptunebusinessclub.github.io/Neptune-messenger-connexio";
const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

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
  mockMode: extra.mockMode === true,
  buildProfile: extra.buildProfile ?? "development",
  releaseStage: extra.releaseStage ?? "development",
  easProjectId: extra.eas?.projectId ?? Constants.easConfig?.projectId ?? ""
} as const;
