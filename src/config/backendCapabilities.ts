export type BackendContract = "neptune-web-v1" | "connexio-v1";

export interface BackendCapabilities {
  sharedAccount: boolean;
  memberDirectory: boolean;
  needsRead: boolean;
  needsWrite: boolean;
  benefitsRead: boolean;
  highlightsCommunity: boolean;
  messaging: boolean;
  messageTranslation: boolean;
  realtime: boolean;
  calls: boolean;
  pushNotifications: boolean;
  accountDeletion: boolean;
  accountSessions: boolean;
  accountExport: boolean;
  notificationPreferences: boolean;
  blockedMembers: boolean;
}

const WEB_BACKEND_CAPABILITIES: BackendCapabilities = {
  sharedAccount: true,
  memberDirectory: true,
  needsRead: true,
  needsWrite: true,
  benefitsRead: true,
  highlightsCommunity: false,
  messaging: false,
  messageTranslation: false,
  realtime: false,
  calls: false,
  pushNotifications: false,
  accountDeletion: true,
  accountSessions: false,
  accountExport: false,
  notificationPreferences: false,
  blockedMembers: false
};

const CONNEXIO_BACKEND_CAPABILITIES: BackendCapabilities = {
  sharedAccount: true,
  memberDirectory: true,
  needsRead: true,
  needsWrite: true,
  benefitsRead: true,
  highlightsCommunity: true,
  messaging: true,
  messageTranslation: true,
  realtime: true,
  calls: true,
  pushNotifications: true,
  accountDeletion: true,
  accountSessions: true,
  accountExport: true,
  notificationPreferences: true,
  blockedMembers: true
};

export function normalizeBackendContract(value: unknown): BackendContract {
  return value === "connexio-v1" ? "connexio-v1" : "neptune-web-v1";
}

export function capabilitiesForBackendContract(
  contract: BackendContract
): BackendCapabilities {
  return contract === "connexio-v1"
    ? CONNEXIO_BACKEND_CAPABILITIES
    : WEB_BACKEND_CAPABILITIES;
}

export function isPublicStoreBackendReady(contract: BackendContract): boolean {
  const capabilities = capabilitiesForBackendContract(contract);
  return (
    capabilities.sharedAccount &&
    capabilities.messaging &&
    capabilities.realtime &&
    capabilities.pushNotifications &&
    capabilities.accountDeletion &&
    capabilities.blockedMembers
  );
}
