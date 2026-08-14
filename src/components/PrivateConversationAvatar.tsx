import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import type { AppUser, Conversation } from "../types/messaging";

export function PrivateConversationAvatar({ conversation, members, currentUserId, size = 50 }: { conversation: Conversation; members: readonly AppUser[]; currentUserId: string; size?: number }) {
  const participants = (conversation.memberIds ?? []).map((id) => members.find((member) => member.id === id)).filter((member): member is AppUser => Boolean(member));
  const visible = conversation.type === "direct" ? [participants.find((member) => member.id !== currentUserId) ?? participants[0]].filter((member): member is AppUser => Boolean(member)) : participants.slice(0, 4);
  const grid = visible.length > 1;
  const half = size / 2;
  return (
    <View accessibilityElementsHidden style={[styles.shell, grid && styles.grid, { width: size, height: size, borderRadius: Math.round(size * 0.3) }]}>
      {visible.map((member, index) => (
        <View key={member.id} style={[styles.cell, grid ? { width: half, height: visible.length === 2 ? size : half } : styles.full, grid && (index === 0 || index === 2) && styles.rightDivider, visible.length > 2 && index < 2 && styles.bottomDivider]}>
          {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} resizeMode="cover" style={styles.image} /> : <Text style={styles.initials}>{member.initials}</Text>}
        </View>
      ))}
      {visible.length === 3 ? <View style={[styles.cell, { width: half, height: half }]}><Text style={styles.initials}>+</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { overflow: "hidden", flexShrink: 0, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { overflow: "hidden", backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  full: { width: "100%", height: "100%" },
  image: { width: "100%", height: "100%" },
  initials: { color: colors.text, fontSize: 11, fontWeight: "900" },
  rightDivider: { borderRightWidth: 1, borderRightColor: colors.background },
  bottomDivider: { borderBottomWidth: 1, borderBottomColor: colors.background }
});
