import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

import type { HighlightMedia } from "../../types/experience";
import type { AttachmentKind, MessageAttachment } from "../../types/messaging";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 120 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
const MAX_HIGHLIGHT_VIDEO_SECONDS = 60;

export class MediaSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaSelectionError";
  }
}

function assertFileSize(sizeBytes: number | undefined, maximum: number, label: string) {
  if (typeof sizeBytes === "number" && sizeBytes > maximum) {
    throw new MediaSelectionError(
      `${label} dépasse la taille maximale de ${Math.round(maximum / 1024 / 1024)} Mo.`
    );
  }
}

async function ensureMediaLibraryPermission(): Promise<void> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return;
  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!requested.granted) {
    throw new MediaSelectionError(
      "L’accès à la photothèque est nécessaire pour choisir ce média."
    );
  }
}

async function pickLibraryAsset(kind: "photo" | "video") {
  await ensureMediaLibraryPermission();
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === "photo" ? ["images"] : ["videos"],
    allowsEditing: kind === "photo",
    quality: kind === "photo" ? 0.88 : 1,
    videoMaxDuration: kind === "video" ? MAX_HIGHLIGHT_VIDEO_SECONDS : undefined,
    selectionLimit: 1
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

export async function pickMessageAttachment(
  kind: AttachmentKind
): Promise<MessageAttachment | null> {
  if (kind === "photo" || kind === "video") {
    const asset = await pickLibraryAsset(kind);
    if (!asset) return null;
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
        `${kind === "photo" ? "photo" : "video"}-${Date.now()}.${
          kind === "photo" ? "jpg" : "mp4"
        }`,
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

  if (kind === "document" || kind === "file") {
    const result = await DocumentPicker.getDocumentAsync({
      type:
        kind === "document"
          ? ["application/pdf", "text/*", "application/msword", "application/vnd.openxmlformats-officedocument.*"]
          : "*/*",
      copyToCacheDirectory: true,
      multiple: false
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    assertFileSize(asset.size, MAX_DOCUMENT_BYTES, "Le fichier");
    return {
      id: `local-attachment-${Crypto.randomUUID()}`,
      kind,
      name: asset.name,
      uri: asset.uri,
      mimeType: asset.mimeType ?? "application/octet-stream",
      sizeBytes: asset.size,
      uploadProgress: 0,
      status: "local"
    };
  }

  if (kind === "location") {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new MediaSelectionError(
        "La localisation doit être autorisée pour partager votre position."
      );
    }
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    const { latitude, longitude, accuracy } = location.coords;
    return {
      id: `local-attachment-${Crypto.randomUUID()}`,
      kind: "location",
      name: "Position approximative",
      uri: `geo:${latitude},${longitude}`,
      mimeType: "application/vnd.neptune.location+json",
      latitude,
      longitude,
      accuracyRadiusMeters:
        typeof accuracy === "number" && accuracy > 0 ? accuracy : 250,
      status: "ready",
      uploadProgress: 1
    };
  }

  throw new MediaSelectionError(
    "Ce type de pièce jointe n’est pas encore autorisé sur cet appareil."
  );
}

export async function pickHighlightMedia(
  kind: "photo" | "video"
): Promise<HighlightMedia | null> {
  const asset = await pickLibraryAsset(kind);
  if (!asset) return null;
  assertFileSize(
    asset.fileSize,
    kind === "photo" ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES,
    kind === "photo" ? "La photo" : "La vidéo"
  );
  const durationSeconds =
    typeof asset.duration === "number" ? asset.duration / 1000 : undefined;
  if (
    kind === "video" &&
    typeof durationSeconds === "number" &&
    durationSeconds > MAX_HIGHLIGHT_VIDEO_SECONDS
  ) {
    throw new MediaSelectionError("La vidéo doit durer 60 secondes maximum.");
  }
  return {
    id: `local-highlight-media-${Crypto.randomUUID()}`,
    kind,
    uri: asset.uri,
    name: asset.fileName ?? `${kind}-${Date.now()}`,
    mimeType:
      asset.mimeType ?? (kind === "photo" ? "image/jpeg" : "video/mp4"),
    sizeBytes: asset.fileSize,
    width: asset.width || undefined,
    height: asset.height || undefined,
    durationSeconds,
    uploadProgress: 0,
    status: "local"
  };
}

export async function pickGroupAvatar(): Promise<string | null> {
  const asset = await pickLibraryAsset("photo");
  if (!asset) return null;
  assertFileSize(asset.fileSize, MAX_PHOTO_BYTES, "L’image du groupe");
  return asset.uri;
}
