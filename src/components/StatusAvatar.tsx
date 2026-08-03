import { Image, StyleSheet, Text, View } from "react-native";

import { getRoleAppearance } from "../domain/roleAppearance";
import type { AppUser } from "../types/messaging";
import { MemberStatusBadge } from "./MemberStatusBadge";

interface StatusAvatarProps {
  user: Pick<AppUser, "name" | "initials" | "avatarUrl" | "role">;
  size?: number;
  showBadge?: boolean;
}

export function StatusAvatar({
  user,
  size = 44,
  showBadge = false
}: StatusAvatarProps) {
  const appearance = getRoleAppearance(user.role);
  const radius = Math.round(size * 0.34);
  return (
    <View style={styles.stage}>
      <View
        accessible
        accessibilityLabel={`${user.name}, statut ${appearance.label}`}
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderColor: appearance.foreground,
            backgroundColor: appearance.background
          }
        ]}
      >
        {user.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl }}
            resizeMode="cover"
            style={[styles.image, { borderRadius: Math.max(1, radius - 4) }]}
          />
        ) : (
          <Text
            style={[
              styles.initials,
              { color: appearance.foreground, fontSize: Math.max(9, size * 0.27) }
            ]}
          >
            {user.initials}
          </Text>
        )}
      </View>
      {showBadge ? (
        <View style={styles.badge}>
          <MemberStatusBadge role={user.role} compact />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: "relative", flexShrink: 0 },
  ring: {
    overflow: "hidden",
    borderWidth: 2.5,
    padding: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  image: { width: "100%", height: "100%" },
  initials: { fontWeight: "900" },
  badge: { position: "absolute", left: "50%", bottom: -11, transform: [{ translateX: -26 }] }
});
