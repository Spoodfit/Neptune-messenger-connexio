import type {
  CoworkingParticipantPresence,
  CoworkingSnapshot,
  CoworkingSpace
} from "../types/coworking";

export function coworkingPresentUserIds(snapshot: CoworkingSnapshot): string[] {
  const ids = new Set<string>();
  for (const id of snapshot.hub.participantIds) ids.add(id);
  for (const space of snapshot.spaces) {
    for (const id of space.participantIds) ids.add(id);
  }
  return [...ids];
}

export function coworkingPresentCount(snapshot: CoworkingSnapshot): number {
  return coworkingPresentUserIds(snapshot).length;
}

export function participantPresence(
  snapshot: CoworkingSnapshot,
  userId: string
): CoworkingParticipantPresence | undefined {
  return snapshot.participants.find((participant) => participant.userId === userId);
}

export function coworkingAvailability(
  presence: CoworkingParticipantPresence | undefined,
  activeSpace: CoworkingSpace | undefined
): "available" | "busy" {
  if (activeSpace) return "busy";
  return presence && presence.mode !== "available" ? "busy" : "available";
}

export type CoworkingMapPrimaryAction = "invite-video" | "knock-space" | "none";

export function coworkingMapPrimaryAction(
  availability: "available" | "busy" | "offline",
  activeSpace: CoworkingSpace | undefined
): CoworkingMapPrimaryAction {
  if (activeSpace) return "knock-space";
  return availability === "available" ? "invite-video" : "none";
}

export function coworkingSpaceHostId(space: CoworkingSpace): string | undefined {
  return space.ownerId && space.participantIds.includes(space.ownerId)
    ? space.ownerId
    : space.participantIds[0];
}

export function removeCoworkingParticipant(
  space: CoworkingSpace,
  userId: string
): CoworkingSpace {
  const participantIds = space.participantIds.filter((id) => id !== userId);
  const ownerId = space.ownerId === userId || !space.ownerId || !participantIds.includes(space.ownerId)
    ? participantIds[0]
    : space.ownerId;
  return { ...space, participantIds, ownerId };
}

export function spaceForUser(
  snapshot: CoworkingSnapshot,
  userId: string
): CoworkingSpace | undefined {
  if (snapshot.hub.participantIds.includes(userId)) return snapshot.hub;
  return snapshot.spaces.find((space) => space.participantIds.includes(userId));
}

export function canJoinCoworkingSpace(
  space: CoworkingSpace,
  userId: string
): boolean {
  if (space.participantIds.includes(userId)) return true;
  if (typeof space.maxParticipants === "number" && space.participantIds.length >= space.maxParticipants) return false;
  if (space.access === "open" || space.access === "request") return true;
  return Boolean(space.invitedUserIds?.includes(userId));
}

export function orderedCoworkingSpaces(spaces: CoworkingSpace[]): CoworkingSpace[] {
  const rank = (space: CoworkingSpace) => {
    if (space.kind === "focus") return 0;
    if (space.access === "open") return 1;
    if (space.access === "request") return 2;
    return 3;
  };
  return [...spaces].sort((left, right) => {
    const byRank = rank(left) - rank(right);
    if (byRank !== 0) return byRank;
    return right.participantIds.length - left.participantIds.length;
  });
}

export function roomOccupancyLabel(space: CoworkingSpace): string {
  const current = space.participantIds.length;
  return typeof space.maxParticipants === "number"
    ? `${current}/${space.maxParticipants}`
    : String(current);
}
