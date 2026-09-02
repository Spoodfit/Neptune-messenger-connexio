import { Platform } from "react-native";

import type { AppUser } from "../types/messaging";

const PUBLIC_MAP_AVATAR_BASE = "https://spoodfit.github.io/Neptune-messenger-connexio/map-avatars";

const MOCK_MAP_AVATARS: Readonly<Record<string, string>> = {
  "user-johan": "johan.webp",
  "user-lea": "lea.webp",
  "user-oceane": "oceane.webp",
  "user-nabiha": "nabiha.webp",
  "user-christelle": "christelle.webp"
};

/**
 * Returns the member's own Connexio character when available. Mock characters
 * are bundled with the web preview; native demos use the same HTTPS assets.
 * The photo URL remains a deliberate fallback while avatar creation is rolled out.
 */
export function mapAvatarUrl(member: Pick<AppUser, "id" | "mapAvatarUrl">): string | undefined {
  if (member.mapAvatarUrl) return member.mapAvatarUrl;
  const filename = MOCK_MAP_AVATARS[member.id];
  if (!filename) return undefined;
  return Platform.OS === "web" ? `map-avatars/${filename}` : `${PUBLIC_MAP_AVATAR_BASE}/${filename}`;
}
