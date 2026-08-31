import type { IntegratedCallSession } from "../services/calls/callRoom";

export interface CallUnansweredEvent {
  callId: string;
  conversationId: string;
  reason?: string;
}

export interface CallSurfaceProps {
  session: IntegratedCallSession;
  displayName: string;
  onClose: () => void;
  onUnanswered?: (event: CallUnansweredEvent) => void;
}
