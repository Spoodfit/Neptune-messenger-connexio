import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { MessageBubble } from "@/components/MessageBubble";
import { useMessaging } from "@/providers/MessagingProvider";
import { colors, radii, spacing, typography } from "@/theme";

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { getConversation, getMessages, sendMessage } = useMessaging();
  const [draft, setDraft] = useState("");

  const conversation = useMemo(
    () => getConversation(params.id),
    [getConversation, params.id]
  );
  const messages = useMemo(
    () => getMessages(params.id),
    [getMessages, params.id]
  );

  if (!conversation) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingTitle}>Conversation introuvable</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const submit = () => {
    const body = draft.trim();
    if (!body) return;

    sendMessage(conversation.id, body);
    setDraft("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.white} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversation.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            {conversation.memberCount} membres
          </Text>
        </View>
        <Pressable style={styles.headerButton}>
          <Ionicons
            name="information-circle-outline"
            size={23}
            color={colors.white}
          />
        </Pressable>
      </View>

      {conversation.pinnedMessage ? (
        <View style={styles.pinned}>
          <Ionicons name="pin" size={16} color={colors.primary} />
          <Text style={styles.pinnedText} numberOfLines={2}>
            {conversation.pinnedMessage}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.messages}
        inverted
      />

      <View style={styles.composer}>
        <Pressable style={styles.attachButton}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Écrire un message…"
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.input}
        />
        <Pressable
          onPress={submit}
          style={[styles.sendButton, !draft.trim() && styles.sendDisabled]}
          disabled={!draft.trim()}
        >
          <Ionicons name="send" size={19} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 22,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.navy,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  headerContent: {
    flex: 1
  },
  headerTitle: {
    ...typography.heading2,
    color: colors.white
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.whiteMuted,
    marginTop: 2
  },
  pinned: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  pinnedText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1
  },
  messages: {
    padding: spacing.md,
    gap: spacing.sm
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
    ...typography.body
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  sendDisabled: {
    opacity: 0.45
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.background
  },
  missingTitle: {
    ...typography.heading2,
    color: colors.text
  },
  backLink: {
    color: colors.primary,
    fontWeight: "800"
  }
});
