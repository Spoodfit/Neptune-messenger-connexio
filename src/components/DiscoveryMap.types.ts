import type { DiscoveryEvent } from "../domain/discoveryEvents";
import type { MapMemberMoment } from "../types/experience";

export type DiscoveryEntitySelection =
  | { kind: "person"; id: string }
  | { kind: "event"; id: string };

export interface DiscoveryMapProps {
  moments: MapMemberMoment[];
  events: DiscoveryEvent[];
  selectedEntity?: DiscoveryEntitySelection | null;
  onSelectEntity: (entity: DiscoveryEntitySelection) => void;
}
