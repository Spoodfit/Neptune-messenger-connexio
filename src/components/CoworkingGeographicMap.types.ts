import type { CoworkingMediaSession } from "../types/coworking";

export type CoworkingAvailability = "available" | "busy";

export interface CoworkingMapMemberCell {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  cameraOn: boolean;
}

export interface CoworkingMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  city?: string;
  availability: CoworkingAvailability;
  spaceId?: string;
  members: CoworkingMapMemberCell[];
}

export interface CoworkingGeographicMapProps {
  markers: CoworkingMapMarker[];
  mediaSession?: CoworkingMediaSession;
  selectedMarkerId?: string | null;
  onSelectMarker: (markerId: string) => void;
  onLocationUnavailable?: () => void;
}
