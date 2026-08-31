import type { MessageAttachment } from "../types/messaging";

export interface VoiceRecorderModalProps {
  visible: boolean;
  onClose: () => void;
  onRecorded: (attachment: MessageAttachment) => void;
  maxDurationSeconds?: number;
  maxSizeBytes?: number;
}

export interface RecordedVoicePayload {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
}
