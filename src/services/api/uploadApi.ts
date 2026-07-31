import type { HighlightMedia } from "../../types/experience";
import type { MessageAttachment } from "../../types/messaging";
import { authenticatedRequest } from "./authenticatedRequest";
import { ApiError } from "./httpClient";

interface PrepareUploadResponse {
  id: string;
  upload_url: string;
  upload_headers?: Record<string, string>;
  expires_at?: string;
}

interface CompleteUploadResponse {
  id: string;
  download_url?: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
}

interface UploadableAsset {
  id: string;
  name?: string;
  uri?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

async function uploadAsset(
  asset: UploadableAsset,
  purpose: "message" | "highlight" | "group-avatar",
  fallbackAccessToken?: string | null,
  onProgress?: (progress: number) => void
): Promise<CompleteUploadResponse> {
  if (!asset.uri) throw new ApiError("Fichier local introuvable.", 0);
  onProgress?.(0.05);
  const prepared = await authenticatedRequest<PrepareUploadResponse>(
    "/v1/uploads/prepare",
    {
      method: "POST",
      body: JSON.stringify({
        purpose,
        filename: asset.name ?? `upload-${asset.id}`,
        mime_type: asset.mimeType ?? "application/octet-stream",
        size_bytes: asset.sizeBytes ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
        duration_seconds: asset.durationSeconds ?? null
      })
    },
    fallbackAccessToken
  );

  onProgress?.(0.18);
  const localResponse = await fetch(asset.uri);
  if (!localResponse.ok) {
    throw new ApiError("Impossible de lire le fichier sélectionné.", 0);
  }
  const blob = await localResponse.blob();
  const headers = new Headers(prepared.upload_headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", asset.mimeType ?? blob.type || "application/octet-stream");
  }
  onProgress?.(0.32);
  const uploaded = await fetch(prepared.upload_url, {
    method: "PUT",
    headers,
    body: blob
  });
  if (!uploaded.ok) {
    throw new ApiError("Échec de l’envoi du fichier vers le stockage privé.", uploaded.status);
  }
  onProgress?.(0.86);
  const completed = await authenticatedRequest<CompleteUploadResponse>(
    `/v1/uploads/${encodeURIComponent(prepared.id)}/complete`,
    { method: "POST" },
    fallbackAccessToken
  );
  onProgress?.(1);
  return completed;
}

export async function uploadMessageAttachment(
  attachment: MessageAttachment,
  fallbackAccessToken?: string | null,
  onProgress?: (progress: number) => void
): Promise<MessageAttachment> {
  if (attachment.kind === "location" || attachment.kind === "contact") {
    return { ...attachment, status: "ready", uploadProgress: 1 };
  }
  const completed = await uploadAsset(
    attachment,
    "message",
    fallbackAccessToken,
    onProgress
  );
  return {
    ...attachment,
    id: completed.id,
    uri: completed.download_url ?? attachment.uri,
    mimeType: completed.mime_type ?? attachment.mimeType,
    sizeBytes: completed.size_bytes ?? attachment.sizeBytes,
    width: completed.width ?? attachment.width,
    height: completed.height ?? attachment.height,
    durationSeconds: completed.duration_seconds ?? attachment.durationSeconds,
    status: "ready",
    uploadProgress: 1
  };
}

export async function uploadHighlightMedia(
  media: HighlightMedia,
  fallbackAccessToken?: string | null,
  onProgress?: (progress: number) => void
): Promise<HighlightMedia> {
  const completed = await uploadAsset(
    media,
    "highlight",
    fallbackAccessToken,
    onProgress
  );
  return {
    ...media,
    id: completed.id,
    uri: completed.download_url ?? media.uri,
    mimeType: completed.mime_type ?? media.mimeType,
    sizeBytes: completed.size_bytes ?? media.sizeBytes,
    width: completed.width ?? media.width,
    height: completed.height ?? media.height,
    durationSeconds: completed.duration_seconds ?? media.durationSeconds,
    status: "ready",
    uploadProgress: 1
  };
}

export async function uploadGroupAvatar(
  uri: string,
  fallbackAccessToken?: string | null
): Promise<string> {
  const completed = await uploadAsset(
    {
      id: `group-avatar-${Date.now()}`,
      name: `group-avatar-${Date.now()}.jpg`,
      uri,
      mimeType: "image/jpeg"
    },
    "group-avatar",
    fallbackAccessToken
  );
  if (!completed.download_url) {
    throw new ApiError("Le backend n’a pas renvoyé l’URL de l’image du groupe.", 502);
  }
  return completed.download_url;
}
