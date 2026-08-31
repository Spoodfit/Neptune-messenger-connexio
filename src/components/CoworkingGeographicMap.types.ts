import type { DiscoveryEventProximity } from "../domain/discoveryEvents";
import type { CoworkingMediaSession } from "../types/coworking";

export type CoworkingAvailability = "available" | "busy" | "offline";

export interface CoworkingMapMemberCell {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  cameraOn: boolean;
  isCurrentUser?: boolean;
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
  startsAt: string;
  endsAt?: string;
  city?: string;
  publicationState?: "voting" | "published" | "cancelled";
}

export interface CoworkingMapClusterSelection {
  markerIds: string[];
  eventIds: string[];
}

export interface CoworkingMapFocusLocation {
  latitude: number;
  longitude: number;
}

export interface CoworkingGeographicMapProps {
  markers: CoworkingMapMarker[];
  events?: CoworkingMapEventMarker[];
  mediaSession?: CoworkingMediaSession;
  focusLocation?: CoworkingMapFocusLocation;
  controlsTop?: number;
  selectedMarkerId?: string | null;
  selectedEventId?: string | null;
  onSelectMarker: (markerId: string) => void;
  onSelectEvent?: (eventId: string) => void;
  onSelectCluster?: (selection: CoworkingMapClusterSelection) => void;
  onInteraction?: () => void;
  onLocationUnavailable?: () => void;
}
