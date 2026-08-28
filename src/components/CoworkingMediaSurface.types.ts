import type { CoworkingMediaSession } from "../types/coworking";

export interface CoworkingMediaLayoutItem {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CoworkingRoomViewMode = "stage" | "overview";

export interface CoworkingMediaSurfaceProps {
  session: CoworkingMediaSession;
  displayName: string;
  cameraOn: boolean;
  microphoneOn: boolean;
  screenSharing?: boolean;
  mapMode?: boolean;
  spatialAudio?: boolean;
  participantLayout?: Record<string, CoworkingMediaLayoutItem>;
  roomViewMode?: CoworkingRoomViewMode;
  focusParticipantId?: string;
  onConnected?: () => void;
  onLocalMediaReady?: () => void;
  onScreenShareStateChange?: (active: boolean) => void;
  onError?: (message: string) => void;
  onLocalMediaUnavailable?: (message: string) => void;
}
