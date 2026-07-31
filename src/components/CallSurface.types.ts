import type { CallMode } from "../services/calls/callRoom";

export interface CallSurfaceProps {
  conversationId: string;
  mode: CallMode;
  displayName: string;
  onClose: () => void;
}
