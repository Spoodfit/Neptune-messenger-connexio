import type { HighlightKind } from "../types/experience";
import type { AppUser, Conversation, UserRole } from "../types/messaging";
import {
  canAccessAllowedRoles,
  isGroupResponsibleRole,
  isVisionnaireRole,
  normalizeUserRole
} from "./roles";

/**
 * Store builds must not direct users to an external checkout to unlock digital
 * functionality. Existing Neptune memberships are recognized by the backend;
 * this route only explains the access level inside Connexio and contains no
 * purchase link.
 */
export const TRITON_CHECKOUT_URL = "neptuneconnexio://membership-required";

export function isFreeRole(role: UserRole): boolean {
  return normalizeUserRole(role) === "free";
}

export function canInitiatePrivateInteraction(role: UserRole): boolean {
  return !isFreeRole(role);
}

export function canReceivePrivateInteraction(_role: UserRole): boolean {
  return true;
}

export function canPublishHighlightKind(
  role: UserRole,
  kind: HighlightKind
): boolean {
  return !isFreeRole(role) || kind === "besoin";
}

export interface GroupJoinDecision {
  visible: boolean;
  canJoin: boolean;
  requiresTriton: boolean;
}

export function getGroupJoinDecision(
  role: UserRole,
  conversation: Conversation
): GroupJoinDecision {
  const visible =
    isVisionnaireRole(role) ||
    canAccessAllowedRoles(role, conversation.allowedRoles) ||
    (isFreeRole(role) && conversation.allowFreeDiscovery === true);

  if (!visible) {
    return { visible: false, canJoin: false, requiresTriton: false };
  }
  if (isFreeRole(role)) {
    return { visible: true, canJoin: false, requiresTriton: true };
  }
  return { visible: true, canJoin: true, requiresTriton: false };
}

export function canBeGroupResponsible(role: UserRole): boolean {
  return isGroupResponsibleRole(role);
}

export function isGroupResponsible(
  userId: string,
  conversation?: Conversation
): boolean {
  return Boolean(conversation?.adminIds?.includes(userId));
}

export function canManageGroup(
  user: Pick<AppUser, "id" | "role">,
  conversation?: Conversation
): boolean {
  return isVisionnaireRole(user.role) || isGroupResponsible(user.id, conversation);
}

export function canManageAllGroupAutomations(
  role: UserRole
): boolean {
  return isVisionnaireRole(role);
}

export function canScheduleMessages(
  user: Pick<AppUser, "id" | "role">,
  conversation?: Conversation
): boolean {
  return canManageGroup(user, conversation);
}

export function canPublishInConversation(
  user: Pick<AppUser, "id" | "role">,
  conversation: Conversation
): boolean {
  if (conversation.type !== "announcement") {
    return conversation.canPost !== false;
  }
  return (
    isVisionnaireRole(user.role) ||
    conversation.announcementPublisherIds?.includes(user.id) === true
  );
}
