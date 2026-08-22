import type { CoworkingMediaSession } from "../types/coworking";

export interface CoworkingMediaSurfaceProps {
  session: CoworkingMediaSession;
  displayName: string;
  cameraOn: boolean;
  microphoneOn: boolean;
  onConnected?: () => void;
  onError?: (message: string) => void;
}
