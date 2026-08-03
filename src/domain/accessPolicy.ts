import type { HighlightKind } from "../types/experience";
import type { AppUser, Conversation, UserRole } from "../types/messaging";
import {
  canAccessAllowedRoles,
  isGroupResponsibleRole,
  isVisionnaireRole,
  normalizeUserRole
} from "./roles";

export const TRITON_CHECKOUT_URL =
  "https://checkout.stripe.com/c/pay/cs_live_b1YnwZceomiOzdr1OrAv6pfplZ6rUUIkjL8UOM1w63Oa4NWOwwRSLKFJTR#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSd2cGd2ZndsdXFsamtQa2x0cGBrYHZ2QGtkZ2lgYSc%2FY2RpdmApJ2JwZGZkaGppYFNkd2xka3EnPydmamtxd2ppJyknZHVsTmB8Jz8ndW5aaWxzYFowNFZVTlVrQ0dNUFVcQW9VdmFLQGJvMGNhPTRMRD1kd11cREpvUFFcS0NjQ1Q2XzN1XVZHbFNHSGNMMG5KSmNzfFFHbGNGM2BGbldvcWBAZFFHaTxmU3JsbDU1N1JcPHJLcm4nKSdjd2poVmB3c2B3Jz9xd3BgKSdnZGZuYndqcGthRmppancnPycmY2NjY2NjJyknaWR8anBxUXx1YCc%2FJ2hwaXFsWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl";

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
