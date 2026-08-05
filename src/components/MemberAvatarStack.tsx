import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import type { AppUser } from "../types/messaging";
import { StatusAvatar } from "./StatusAvatar";

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
        {resolvedMembers.map((member, index) => (
          <View
            key={member.id}
            style={{
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: visibleLimit - index,
              transform: [{ translateY: index % 2 === 0 ? 0 : 1 }]
            }}
          >
            <StatusAvatar
              user={member}
              size={size}
              ringWidth={2}
              accessible={false}
            />
          </View>
        ))}
        {resolvedMembers.length === 0 ? (
          <View
            style={[
              styles.fallback,
              {
                width: size,
                height: size,
                borderRadius: Math.round(size * 0.38)
              }
            ]}
          >
            <Text style={[styles.fallbackText, { fontSize: Math.max(7, size * 0.31) }]}>N</Text>
          </View>
        ) : null}
        {missing > 0 && resolvedMembers.length > 0 ? (
          <View
            style={[
              styles.fallback,
              {
                width: size,
                height: size,
                borderRadius: Math.round(size * 0.38),
                marginLeft: -overlap
              }
            ]}
          >
            <Text style={[styles.fallbackText, { fontSize: Math.max(11, size * 0.27) }]}>+{missing}</Text>
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
  fallback: {
    borderWidth: 2,
    borderColor: colors.navyLight,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  fallbackText: { color: colors.textSecondary, fontWeight: "900" },
  count: {
    marginLeft: 5,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    flexShrink: 0
  }
});
