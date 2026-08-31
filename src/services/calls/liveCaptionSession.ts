import "./callRoom";

declare module "./callRoom" {
  interface IntegratedCallSession {
    captioningEnabled?: boolean;
    captionTargetLanguage?: string;
    captionsDefaultOn?: boolean;
    captionAudioChunkMs?: number;
    captionMaxAudioBase64Length?: number;
  }
}

export {};
