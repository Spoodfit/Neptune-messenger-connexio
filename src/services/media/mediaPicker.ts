import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

import type { HighlightMedia, HighlightPost } from "../../types/experience";
import type { AttachmentKind, MessageAttachment } from "../../types/messaging";

export const MAX_MESSAGE_ATTACHMENTS = 10;
export const MAX_MESSAGE_BATCH_BYTES = 120 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const MAX_HIGHLIGHT_VIDEO_SECONDS = 60;

export type MediaSelectionErrorCode =
  | "too-large"
  | "too-long"
  | "permission"
  | "unsupported"
  | "batch-limit";

export class MediaSelectionError extends Error {
  constructor(
    message: string,
    readonly code: MediaSelectionErrorCode = "unsupported"
  ) {
    super(message);
    this.name = "MediaSelectionError";
  }
}

function assertFileSize(
  sizeBytes: number | undefined,
  maximum: number,
  label: string
) {
  if (typeof sizeBytes === "number" && sizeBytes > maximum) {
    const selectedSize = Math.ceil(sizeBytes / 1024 / 1024);
    const maximumSize = Math.round(maximum / 1024 / 1024);
    throw new MediaSelectionError(
      `Import bloqué : ${label.toLocaleLowerCase("fr")} pèse ${selectedSize} Mo, alors que la limite autorisée est de ${maximumSize} Mo. Compressez le fichier ou choisissez une version plus légère.`,
      "too-large"
    );
  }
}

export function assertAttachmentBatch(
  attachments: readonly MessageAttachment[]
): void {
  if (attachments.length > MAX_MESSAGE_ATTACHMENTS) {
    throw new MediaSelectionError(
      `Import bloqué : un message accepte ${MAX_MESSAGE_ATTACHMENTS} contenus maximum.`,
      "batch-limit"
    );
  }
  const total = attachments.reduce(
    (sum, attachment) => sum + (attachment.sizeBytes ?? 0),
    0
  );
  if (total > MAX_MESSAGE_BATCH_BYTES) {
    throw new MediaSelectionError(
      `Import bloqué : la sélection dépasse ${Math.round(
        MAX_MESSAGE_BATCH_BYTES / 1024 / 1024
      )} Mo. Retirez un fichier ou envoyez la sélection en plusieurs messages.`,
      "batch-limit"
    );
  }
}

async function ensureMediaLibraryPermission(): Promise<void> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return;
  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!requested.granted) {
    throw new MediaSelectionError(
      "L’accès à la photothèque est nécessaire pour choisir ce média.",
      "permission"
    );
  }
}

function imageAssetToAttachment(
  asset: ImagePicker.ImagePickerAsset,
  kind: "photo" | "video"
): MessageAttachment {
  assertFileSize(
    asset.fileSize,
    kind === "photo" ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES,
    kind === "photo" ? "La photo" : "La vidéo"
  );
  return {
    id: `local-attachment-${Crypto.randomUUID()}`,
    kind,
    name:
      asset.fileName ??
      `${kind === "photo" ? "photo" : "video"}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}.${kind === "photo" ? "jpg" : "mp4"}`,
    uri: asset.uri,
    mimeType:
      asset.mimeType ?? (kind === "photo" ? "image/jpeg" : "video/mp4"),
    sizeBytes: asset.fileSize,
    durationSeconds:
      typeof asset.duration === "number" ? asset.duration / 1000 : undefined,
    width: asset.width || undefined,
    height: asset.height || undefined,
    uploadProgress: 0,
    status: "local"
  };
}

async function pickLibraryAssets(
  kind: "photo" | "video",
  limit: number
): Promise<MessageAttachment[]> {
  await ensureMediaLibraryPermission();
  const safeLimit = Math.max(1, Math.min(MAX_MESSAGE_ATTACHMENTS, limit));
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === "photo" ? ["images"] : ["videos"],
    allowsMultipleSelection: safeLimit > 1,
    selectionLimit: safeLimit,
    quality: kind === "photo" ? 0.88 : 1,
    videoMaxDuration: kind === "video" ? MAX_HIGHLIGHT_VIDEO_SECONDS : undefined,
    orderedSelection: true
  });
  if (result.canceled) return [];
  const attachments = result.assets
    .slice(0, safeLimit)
    .map((asset) => imageAssetToAttachment(asset, kind));
  assertAttachmentBatch(attachments);
  return attachments;
}

export async function pickMessageAttachments(
  kind: AttachmentKind,
  limit = MAX_MESSAGE_ATTACHMENTS
): Promise<MessageAttachment[]> {
  if (kind === "photo" || kind === "video") {
    return pickLibraryAssets(kind, limit);
  }

  if (kind === "document" || kind === "file") {
    const safeLimit = Math.max(1, Math.min(MAX_MESSAGE_ATTACHMENTS, limit));
    const result = await DocumentPicker.getDocumentAsync({
      type:
        kind === "document"
          ? [
              "application/pdf",
              "text/*",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.*"
            ]
          : "*/*",
      copyToCacheDirectory: true,
      multiple: safeLimit > 1
    });
    if (result.canceled) return [];
    const attachments = result.assets.slice(0, safeLimit).map((asset) => {
      assertFileSize(asset.size, MAX_DOCUMENT_BYTES, "Le fichier");
      return {
        id: `local-attachment-${Crypto.randomUUID()}`,
        kind,
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? "application/octet-stream",
        sizeBytes: asset.size,
        uploadProgress: 0,
        status: "local" as const
      };
    });
    assertAttachmentBatch(attachments);
    return attachments;
  }

  if (kind === "location") {
    const coordinates = await pickApproximateLocation();
    return [
      {
        id: `local-attachment-${Crypto.randomUUID()}`,
        kind: "location",
        name: "Position approximative",
        uri: `geo:${coordinates.latitude},${coordinates.longitude}`,
        mimeType: "application/vnd.neptune.location+json",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracyRadiusMeters: coordinates.accuracyRadiusMeters,
        status: "ready",
        uploadProgress: 1
      }
    ];
  }

  throw new MediaSelectionError(
    "Ce type de pièce jointe n’est pas autorisé sur cet appareil.",
    "unsupported"
  );
}

export async function pickMessageAttachment(
  kind: AttachmentKind
): Promise<MessageAttachment | null> {
  return (await pickMessageAttachments(kind, 1))[0] ?? null;
}

export async function pickHighlightMedia(
  kind: "photo" | "video"
): Promise<HighlightMedia | null> {
  const attachments = await pickLibraryAssets(kind, 1);
  const asset = attachments[0];
  if (!asset) return null;
  if (
    kind === "video" &&
    typeof asset.durationSeconds === "number" &&
    asset.durationSeconds > MAX_HIGHLIGHT_VIDEO_SECONDS
  ) {
    throw new MediaSelectionError(
      "Import bloqué : la vidéo dépasse 60 secondes. Raccourcissez-la avant de la publier.",
      "too-long"
    );
  }
  return {
    id: `local-highlight-media-${Crypto.randomUUID()}`,
    kind,
    uri: asset.uri ?? "",
    name: asset.name,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    width: asset.width,
    height: asset.height,
    durationSeconds: asset.durationSeconds,
    uploadProgress: 0,
    status: "local"
  };
}

export async function pickGroupAvatar(): Promise<string | null> {
  await ensureMediaLibraryPermission();
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
    selectionLimit: 1
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  assertFileSize(asset.fileSize, MAX_PHOTO_BYTES, "L’image du groupe");
  return asset.uri;
}

export async function pickApproximateLocation(): Promise<
  NonNullable<HighlightPost["coordinates"]>
> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new MediaSelectionError(
      "La localisation doit être autorisée pour partager une position approximative.",
      "permission"
    );
  }
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced
  });
  const accuracy = location.coords.accuracy ?? 250;
  const privacyRadius = Math.min(3_000, Math.max(1_000, accuracy * 3));
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracyRadiusMeters: Math.round(privacyRadius)
  };
}
