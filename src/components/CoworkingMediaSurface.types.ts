import type { CoworkingMediaSession } from "../types/coworking";

export interface CoworkingMediaLayoutItem {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoworkingMediaSurfaceProps {
  session: CoworkingMediaSession;
  displayName: string;
  cameraOn: boolean;
  microphoneOn: boolean;
  mapMode?: boolean;
  spatialAudio?: boolean;
  participantLayout?: Record<string, CoworkingMediaLayoutItem>;
  onConnected?: () => void;
  onError?: (message: string) => void;
}
