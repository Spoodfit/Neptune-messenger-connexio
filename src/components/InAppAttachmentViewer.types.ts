import type { MessageAttachment } from "../types/messaging";

export interface InAppAttachmentViewerProps {
  attachment: MessageAttachment;
  visible: boolean;
  onClose: () => void;
}
