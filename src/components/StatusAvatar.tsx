import { Text } from "@/components/LocalizedText";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { getRoleAppearance } from "../domain/roleAppearance";
import { useAppTheme } from "../providers/ThemeProvider";
import type { UserRole } from "../types/messaging";
import { MemberStatusBadge } from "./MemberStatusBadge";

export interface StatusAvatarUser {
  name: string;
  initials: string;
  avatarUrl?: string;
  role?: UserRole;
}

interface StatusAvatarProps {
  user: StatusAvatarUser;
  size?: number;
  showBadge?: boolean;
  accessible?: boolean;
  ringWidth?: number;
  overlap?: boolean;
}

export function StatusAvatar({ user, size = 44, showBadge = false, accessible = true, ringWidth = 2.5, overlap = false }: StatusAvatarProps) {
  const theme = useAppTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const role = user.role ?? "free";
  const appearance = getRoleAppearance(role, theme.isLight);
  const radius = size / 2;
  const safeRingWidth = Math.max(2, Math.min(ringWidth, size * 0.09));

  useEffect(() => { setImageFailed(false); }, [user.avatarUrl]);

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? `${user.name}, statut ${appearance.label}` : undefined}
      style={[styles.stage, overlap && styles.overlap, showBadge && styles.withBadgeSpace]}
    >
      <LinearGradient
        colors={appearance.ringColors as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: radius,
            padding: safeRingWidth,
            shadowColor: appearance.glowColor,
            shadowOpacity: theme.isLight ? 0.12 : 0.48,
            shadowRadius: theme.isLight ? 3 : 8,
            elevation: theme.isLight ? 0 : 4
          }
        ]}
      >
        <View style={[styles.inner, { borderRadius: Math.max(1, radius - safeRingWidth), backgroundColor: appearance.background }]}>
          {user.avatarUrl && !imageFailed ? <Image source={{ uri: user.avatarUrl }} onError={() => setImageFailed(true)} resizeMode="cover" style={styles.image} /> : <Text numberOfLines={1} style={[styles.initials, { color: appearance.foreground, fontSize: Math.max(7, size * 0.27) }]}>{user.initials || "N"}</Text>}
        </View>
      </LinearGradient>
      {showBadge ? <View pointerEvents="none" style={styles.badge}><MemberStatusBadge role={role} compact /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: "relative", flexShrink: 0, alignItems: "center" },
  overlap: { marginHorizontal: -2 },
  withBadgeSpace: { marginBottom: 14 },
  ring: { alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 0 } },
  inner: { flex: 1, width: "100%", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  initials: { fontWeight: "900" },
  badge: { position: "absolute", bottom: -12, alignSelf: "center", zIndex: 2 }
});
