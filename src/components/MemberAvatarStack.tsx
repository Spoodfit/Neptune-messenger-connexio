import { Text } from "@/components/LocalizedText";
import { StyleSheet, View } from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import type { AppUser } from "../types/messaging";
import { StatusAvatar } from "./StatusAvatar";

interface MemberAvatarStackProps {
  memberIds?: readonly string[];
  members: readonly AppUser[];
  memberCount: number;
  maxVisible?: number;
  size?: number;
  showCount?: boolean;
  showOverflow?: boolean;
  activityFirst?: boolean;
}

function resolveVisibleLimit(memberCount: number, requested: number): number {
  if (memberCount >= 30) return Math.max(requested, 12);
  if (memberCount >= 18) return Math.max(requested, 11);
  if (memberCount >= 10) return Math.max(requested, 10);
  if (memberCount >= 6) return Math.max(requested, 8);
  return requested;
}

function activityScore(member: AppUser): number {
  if (member.online) return Number.MAX_SAFE_INTEGER;
  const seen = Date.parse(member.lastSeenAt ?? "");
  return Number.isFinite(seen) ? seen : 0;
}

export function MemberAvatarStack({
  memberIds = [],
  members,
  memberCount,
  maxVisible = 4,
  size = 25,
  showCount = true,
  showOverflow = true,
  activityFirst = false
}: MemberAvatarStackProps) {
  const theme = useAppTheme();
  const visibleLimit = resolveVisibleLimit(memberCount, maxVisible);
  const orderedPool = activityFirst
    ? [...members].sort((left, right) => activityScore(right) - activityScore(left))
    : members;
  const ids = memberIds.length > 0
    ? memberIds
    : orderedPool.slice(0, Math.min(memberCount, visibleLimit)).map((member) => member.id);
  const resolvedMembers = ids
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is AppUser => Boolean(member));
  const orderedMembers = activityFirst
    ? [...resolvedMembers].sort((left, right) => activityScore(right) - activityScore(left))
    : resolvedMembers;
  const visibleMembers = orderedMembers.slice(0, visibleLimit);
  const missing = Math.max(0, memberCount - visibleMembers.length);
  const overlap = Math.round(size * (visibleMembers.length >= 10 ? 0.54 : visibleMembers.length >= 7 ? 0.46 : visibleMembers.length >= 5 ? 0.38 : 0.3));

  return (
    <View accessible accessibilityLabel={`${memberCount} membre${memberCount > 1 ? "s" : ""}. Les profils sont classés du plus actif au moins actif.`} style={styles.row}>
      <View style={styles.stack}>
        {visibleMembers.map((member, index) => (
          <View key={member.id} style={{ marginLeft: index === 0 ? 0 : -overlap, zIndex: visibleLimit - index }}>
            <StatusAvatar user={member} size={size} ringWidth={Math.max(2, size * 0.08)} accessible={false} />
          </View>
        ))}
        {visibleMembers.length === 0 ? (
          <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, borderColor: theme.border, backgroundColor: theme.surfaceStrong }]}>
            <Text style={[styles.fallbackText, { color: theme.pageTextSecondary, fontSize: Math.max(7, size * 0.31) }]}>N</Text>
          </View>
        ) : null}
        {showOverflow && missing > 0 && visibleMembers.length > 0 ? (
          <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, marginLeft: -overlap, borderColor: theme.border, backgroundColor: theme.surfaceStrong }]}>
            <Text style={[styles.fallbackText, { color: theme.pageTextSecondary, fontSize: Math.max(11, size * 0.27) }]}>+{missing}</Text>
          </View>
        ) : null}
      </View>
      {showCount ? <Text style={[styles.count, { color: theme.pageTextMuted }]}>{memberCount}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 28, minWidth: 0, flexShrink: 1 },
  stack: { flexDirection: "row", alignItems: "center", minWidth: 0, flexShrink: 1, overflow: "hidden" },
  fallback: { borderWidth: 2, alignItems: "center", justifyContent: "center" },
  fallbackText: { fontWeight: "900" },
  count: { marginLeft: 5, fontSize: 11, fontWeight: "800", flexShrink: 0 }
});
