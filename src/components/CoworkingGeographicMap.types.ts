import type { DiscoveryEventProximity } from "../domain/discoveryEvents";
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

export interface CoworkingMapEventMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  proximity: DiscoveryEventProximity;
}

export interface CoworkingGeographicMapProps {
  markers: CoworkingMapMarker[];
  events?: CoworkingMapEventMarker[];
  mediaSession?: CoworkingMediaSession;
  selectedMarkerId?: string | null;
  selectedEventId?: string | null;
  onSelectMarker: (markerId: string) => void;
  onSelectEvent?: (eventId: string) => void;
  onLocationUnavailable?: () => void;
  onMediaUnavailable?: (message: string) => void;
}
