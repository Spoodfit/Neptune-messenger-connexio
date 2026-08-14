import { StyleSheet, Text, View } from "react-native";

import { getRoleAppearance } from "../domain/roleAppearance";
import type { AppUser, Conversation } from "../types/messaging";
import { StatusAvatar } from "./StatusAvatar";

interface Props {
  conversation: Conversation;
  members: readonly AppUser[];
  currentUserId: string;
  size?: number;
}

type AvatarSlot = { size: number; left: number; top: number; zIndex: number };

function slotsFor(count: number, size: number): AvatarSlot[] {
  if (count <= 1) return [{ size, left: 0, top: 0, zIndex: 4 }];
  if (count === 2) {
    const avatar = Math.round(size * 0.72);
    return [
      { size: avatar, left: 0, top: Math.round((size - avatar) / 2), zIndex: 3 },
      { size: avatar, left: size - avatar, top: Math.round((size - avatar) / 2), zIndex: 4 }
    ];
  }
  if (count === 3) {
    const avatar = Math.round(size * 0.62);
    return [
      { size: avatar, left: Math.round((size - avatar) / 2), top: 0, zIndex: 5 },
      { size: avatar, left: 0, top: size - avatar, zIndex: 3 },
      { size: avatar, left: size - avatar, top: size - avatar, zIndex: 4 }
    ];
  }
  const avatar = Math.round(size * 0.57);
  return [
    { size: avatar, left: 0, top: 0, zIndex: 3 },
    { size: avatar, left: size - avatar, top: 0, zIndex: 4 },
    { size: avatar, left: 0, top: size - avatar, zIndex: 5 },
    { size: avatar, left: size - avatar, top: size - avatar, zIndex: 6 }
  ];
}

export function PrivateConversationAvatar({ conversation, members, currentUserId, size = 52 }: Props) {
  const participants = (conversation.memberIds ?? [])
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is AppUser => Boolean(member));

  if (conversation.type === "direct") {
    const member = participants.find((item) => item.id !== currentUserId) ?? participants[0];
    if (member) return <StatusAvatar user={member} size={size} accessible={false} ringWidth={3} />;
  }

  const visible = participants.slice(0, 4);
  const slots = slotsFor(visible.length, size);
  if (visible.length === 0) {
    const appearance = getRoleAppearance("free");
    return (
      <View accessibilityElementsHidden style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, borderColor: appearance.foreground }]}>
        <Text style={[styles.fallbackText, { color: appearance.foreground }]}>N</Text>
      </View>
    );
  }

  return (
    <View
      accessibilityElementsHidden
      style={[styles.stage, { width: size, height: size }]}
    >
      {visible.map((member, index) => {
        const slot = slots[index]!;
        return (
          <View
            key={member.id}
            style={[
              styles.absolute,
              {
                left: slot.left,
                top: slot.top,
                zIndex: slot.zIndex
              }
            ]}
          >
            <StatusAvatar
              user={member}
              size={slot.size}
              ringWidth={Math.max(2, slot.size * 0.07)}
              accessible={false}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: "relative",
    flexShrink: 0
  },
  absolute: { position: "absolute" },
  fallback: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  fallbackText: { fontSize: 14, fontWeight: "900" }
});
