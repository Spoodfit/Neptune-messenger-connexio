import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import type { AppUser, Conversation } from "../types/messaging";
import { StatusAvatar } from "./StatusAvatar";

function positions(count: number, size: number, avatarSize: number) {
  const max = size - avatarSize;
  if (count <= 1) return [{ left: 0, top: 0 }];
  if (count === 2) return [
    { left: 0, top: Math.round(max * 0.08) },
    { left: max, top: Math.round(max * 0.92) }
  ];
  if (count === 3) return [
    { left: Math.round(max * 0.48), top: 0 },
    { left: 0, top: max },
    { left: max, top: max }
  ];
  return [
    { left: 0, top: 0 },
    { left: max, top: 0 },
    { left: 0, top: max },
    { left: max, top: max }
  ];
}

export function PrivateConversationAvatar({
  conversation,
  members,
  currentUserId,
  size = 50
}: {
  conversation: Conversation;
  members: readonly AppUser[];
  currentUserId: string;
  size?: number;
}) {
  const participants = (conversation.memberIds ?? [])
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is AppUser => Boolean(member));
  const visible = conversation.type === "direct"
    ? [participants.find((member) => member.id !== currentUserId) ?? participants[0]].filter(
        (member): member is AppUser => Boolean(member)
      )
    : participants.filter((member) => member.id !== currentUserId).slice(0, 4);

  if (visible.length === 1) {
    return <StatusAvatar user={visible[0]} size={size} ringWidth={2.5} accessible={false} />;
  }

  if (visible.length === 0) {
    return (
      <View
        accessibilityElementsHidden
        style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Text style={styles.initials}>N</Text>
      </View>
    );
  }

  const avatarSize = Math.max(27, Math.round(size * (visible.length === 2 ? 0.68 : 0.58)));
  const avatarPositions = positions(visible.length, size, avatarSize);

  return (
    <View accessibilityElementsHidden style={[styles.cluster, { width: size, height: size }]}>
      {visible.map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.clusterItem,
            avatarPositions[index],
            { zIndex: visible.length - index }
          ]}
        >
          <StatusAvatar user={member} size={avatarSize} ringWidth={2} accessible={false} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    position: "relative",
    flexShrink: 0
  },
  clusterItem: {
    position: "absolute"
  },
  fallback: {
    flexShrink: 0,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  initials: { color: colors.text, fontSize: 11, fontWeight: "900" }
});
