import { Image, StyleSheet, Text, View } from "react-native";

import { getRoleAppearance } from "../domain/roleAppearance";
import { colors } from "../theme";
import type { AppUser } from "../types/messaging";

interface MemberAvatarStackProps {
  memberIds?: readonly string[];
  members: readonly AppUser[];
  memberCount: number;
  maxVisible?: number;
  size?: number;
  showCount?: boolean;
}

function resolveVisibleLimit(memberCount: number, requested: number): number {
  if (memberCount >= 30) return Math.max(requested, 9);
  if (memberCount >= 18) return Math.max(requested, 8);
  if (memberCount >= 10) return Math.max(requested, 7);
  if (memberCount >= 6) return Math.max(requested, 6);
  return requested;
}

export function MemberAvatarStack({
  memberIds = [],
  members,
  memberCount,
  maxVisible = 4,
  size = 25,
  showCount = true
}: MemberAvatarStackProps) {
  const visibleLimit = resolveVisibleLimit(memberCount, maxVisible);
  const resolvedMembers = memberIds
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is AppUser => Boolean(member))
    .slice(0, visibleLimit);
  const missing = Math.max(0, memberCount - resolvedMembers.length);
  const overlap = Math.round(
    size * (resolvedMembers.length >= 8 ? 0.48 : resolvedMembers.length >= 6 ? 0.4 : 0.3)
  );

  return (
    <View
      accessible
      accessibilityLabel={`${memberCount} membre${memberCount > 1 ? "s" : ""}. Les contours indiquent les statuts Neptune.`}
      style={styles.row}
    >
      <View style={styles.stack}>
        {resolvedMembers.map((member, index) => {
          const appearance = getRoleAppearance(member.role);
          return (
            <View
              key={member.id}
              style={[
                styles.avatar,
                {
                  width: size,
                  height: size,
                  borderRadius: Math.round(size * 0.38),
                  marginLeft: index === 0 ? 0 : -overlap,
                  zIndex: visibleLimit - index,
                  transform: [{ translateY: index % 2 === 0 ? 0 : 1 }],
                  borderColor: appearance.foreground,
                  backgroundColor: appearance.background
                }
              ]}
            >
              {member.avatarUrl ? (
                <Image source={{ uri: member.avatarUrl }} style={styles.image} />
              ) : (
                <Text
                  style={[
                    styles.initials,
                    {
                      fontSize: Math.max(7, size * 0.31),
                      color: appearance.foreground
                    }
                  ]}
                >
                  {member.initials}
                </Text>
              )}
            </View>
          );
        })}
        {resolvedMembers.length === 0 ? (
          <View
            style={[
              styles.avatar,
              styles.emptyAvatar,
              {
                width: size,
                height: size,
                borderRadius: Math.round(size * 0.38)
              }
            ]}
          >
            <Text style={[styles.initials, { fontSize: Math.max(7, size * 0.31) }]}>N</Text>
          </View>
        ) : null}
        {missing > 0 && resolvedMembers.length > 0 ? (
          <View
            style={[
              styles.avatar,
              styles.overflowAvatar,
              {
                width: size,
                height: size,
                borderRadius: Math.round(size * 0.38),
                marginLeft: -overlap,
                zIndex: 0
              }
            ]}
          >
            <Text style={[styles.overflowText, { fontSize: Math.max(6.5, size * 0.27) }]}>
              +{missing}
            </Text>
          </View>
        ) : null}
      </View>
      {showCount ? <Text style={styles.count}>{memberCount}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 28, minWidth: 0 },
  stack: { flexDirection: "row", alignItems: "center", minWidth: 0, flexShrink: 1 },
  avatar: {
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyAvatar: { backgroundColor: colors.surfaceStrong, borderColor: colors.navyLight },
  overflowAvatar: { backgroundColor: colors.surfaceStrong, borderColor: colors.navyLight },
  image: { width: "100%", height: "100%" },
  initials: { color: colors.text, fontWeight: "900" },
  overflowText: { color: colors.textSecondary, fontWeight: "900" },
  count: {
    marginLeft: 5,
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: "800",
    flexShrink: 0
  }
});
