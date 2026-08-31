import type { MapMemberMoment } from "../types/experience";

export interface NeptuneMapProps {
  moments: MapMemberMoment[];
  selectedMemberId?: string | null;
  onSelectMember: (memberId: string) => void;
}
