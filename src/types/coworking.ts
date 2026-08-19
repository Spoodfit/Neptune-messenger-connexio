export type CoworkingPresenceMode = "focus" | "available" | "talk" | "break";
export type CoworkingSpaceKind = "hub" | "open" | "private" | "focus";
export type CoworkingSpaceAccess = "open" | "request" | "invite";

export interface CoworkingParticipantPresence {
  userId: string;
  mode: CoworkingPresenceMode;
  statusText?: string;
  cameraOn: boolean;
  microphoneOn: boolean;
  speaking: boolean;
  joinedAt: string;
}

export interface CoworkingSpace {
  id: string;
  name: string;
  kind: CoworkingSpaceKind;
  access: CoworkingSpaceAccess;
  ownerId?: string;
  participantIds: string[];
  invitedUserIds?: string[];
  maxParticipants?: number;
  activity?: string;
  focusEndsAt?: string;
  mediaEnabled: boolean;
}

export interface CoworkingSnapshot {
  hub: CoworkingSpace;
  spaces: CoworkingSpace[];
  participants: CoworkingParticipantPresence[];
  currentUserSpaceId?: string;
  updatedAt: string;
}

export interface CoworkingMediaSession {
  spaceId: string;
  socketUrl: string;
  socketPath: string;
  clientScriptUrl?: string;
  token: string;
  participantId: string;
  iceServers: RTCIceServer[];
  expiresAt?: string;
  mock?: boolean;
}

export interface CreateCoworkingSpaceInput {
  name: string;
  kind: Exclude<CoworkingSpaceKind, "hub">;
  access: CoworkingSpaceAccess;
  invitedUserIds?: string[];
  activity?: string;
  focusMinutes?: number;
}

export interface JoinCoworkingResult {
  snapshot: CoworkingSnapshot;
  media?: CoworkingMediaSession;
}
