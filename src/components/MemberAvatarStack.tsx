import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import type { AppUser } from "../types/messaging";

interface MemberAvatarStackProps {
  memberIds?: readonly string[];
  members: readonly AppUser[];
  memberCount: number;
  maxVisible?: number;
  size?: number;
}

export function MemberAvatarStack({
  memberIds = [],
  members,
  memberCount,
  maxVisible = 4,
  size = 25
}: MemberAvatarStackProps) {
  const resolvedMembers = memberIds
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is AppUser => Boolean(member))
    .slice(0, maxVisible);
  const missing = Math.max(0, memberCount - resolvedMembers.length);

  return (
    <View
      accessible
      accessibilityLabel={`${memberCount} membre${memberCount > 1 ? "s" : ""}`}
      style={styles.row}
    >
      <View style={styles.stack}>
        {resolvedMembers.map((member, index) => (
          <View
            key={member.id}
            style={[
              styles.avatar,
              {
                width: size,
                height: size,
                borderRadius: Math.round(size * 0.38),
                marginLeft: index === 0 ? 0 : -Math.round(size * 0.3),
                zIndex: maxVisible - index
              }
            ]}
          >
            {member.avatarUrl ? (
              <Image source={{ uri: member.avatarUrl }} style={styles.image} />
            ) : (
              <Text style={[styles.initials, { fontSize: Math.max(7, size * 0.31) }]}>
                {member.initials}
              </Text>
            )}
          </View>
        ))}
        {resolvedMembers.length === 0 ? (
          <View
            style={[
              styles.avatar,
              styles.emptyAvatar,
              { width: size, height: size, borderRadius: Math.round(size * 0.38) }
            ]}
          >
            <Text style={[styles.initials, { fontSize: Math.max(7, size * 0.31) }]}>N</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.count}>
        {memberCount}
        {missing > 0 && memberCount > maxVisible ? " membres" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 28 },
  stack: { flexDirection: "row", alignItems: "center" },
  avatar: {
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.navyLight,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyAvatar: { backgroundColor: colors.surfaceStrong },
  image: { width: "100%", height: "100%" },
  initials: { color: colors.text, fontWeight: "900" },
  count: { marginLeft: 5, color: colors.textMuted, fontSize: 9.5, fontWeight: "800" }
});
