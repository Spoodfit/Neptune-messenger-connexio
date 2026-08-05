import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { getRoleAppearance } from "../domain/roleAppearance";
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

export function StatusAvatar({
  user,
  size = 44,
  showBadge = false,
  accessible = true,
  ringWidth = 2.5,
  overlap = false
}: StatusAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const role = user.role ?? "free";
  const appearance = getRoleAppearance(role);
  const radius = Math.round(size * 0.34);

  useEffect(() => {
    setImageFailed(false);
  }, [user.avatarUrl]);

  return (
    <View
      accessible={accessible}
      accessibilityLabel={
        accessible ? `${user.name}, statut ${appearance.label}` : undefined
      }
      style={[styles.stage, overlap && styles.overlap]}
    >
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth: ringWidth,
            borderColor: appearance.foreground,
            backgroundColor: appearance.background,
            shadowColor: appearance.foreground
          }
        ]}
      >
        {user.avatarUrl && !imageFailed ? (
          <Image
            source={{ uri: user.avatarUrl }}
            onError={() => setImageFailed(true)}
            resizeMode="cover"
            style={[styles.image, { borderRadius: Math.max(1, radius - 4) }]}
          />
        ) : (
          <Text
            numberOfLines={1}
            style={[
              styles.initials,
              {
                color: appearance.foreground,
                fontSize: Math.max(7, size * 0.27)
              }
            ]}
          >
            {user.initials || "N"}
          </Text>
        )}
      </View>
      {showBadge ? (
        <View pointerEvents="none" style={styles.badge}>
          <MemberStatusBadge role={role} compact />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: "relative",
    flexShrink: 0,
    alignItems: "center"
  },
  overlap: { marginHorizontal: -2 },
  ring: {
    overflow: "hidden",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.34,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3
  },
  image: { width: "100%", height: "100%" },
  initials: { fontWeight: "900" },
  badge: {
    position: "absolute",
    bottom: -12,
    alignSelf: "center",
    zIndex: 2
  }
});
