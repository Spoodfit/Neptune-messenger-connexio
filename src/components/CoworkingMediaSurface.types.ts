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
  /** Positions every participant video on the single collaborative grid. */
  gridLayout?: boolean;
  participantLayout?: Record<string, CoworkingMediaLayoutItem>;
  roomViewMode?: CoworkingRoomViewMode;
  focusParticipantId?: string;
  onConnected?: () => void;
  onLocalMediaReady?: () => void;
  onScreenShareStateChange?: (active: boolean) => void;
  onCapabilities?: (capabilities: { screenShare: boolean }) => void;
  onAudioLevel?: (participantId: string, level: number) => void;
  onError?: (message: string) => void;
  onLocalMediaUnavailable?: (message: string) => void;
}
