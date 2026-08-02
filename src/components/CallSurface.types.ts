import type { IntegratedCallSession } from "../services/calls/callRoom";

export interface CallSurfaceProps {
  session: IntegratedCallSession;
  displayName: string;
  onClose: () => void;
}
