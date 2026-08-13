import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getLanguageFrenchName, isSameLanguage } from "../i18n/languages";
import { resolveMessagePresentation } from "../domain/messageTranslation";
import { useTranslationPreferences } from "../providers/TranslationPreferencesProvider";
import { colors, spacing } from "../theme";
import { MessageBubble } from "./MessageBubble";

type MessageBubbleProps = ComponentProps<typeof MessageBubble>;

export function TranslatedMessageBubble(props: MessageBubbleProps) {
  const { message, centered = false } = props;
  const { enabled, targetLanguage } = useTranslationPreferences();
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    setShowOriginal(false);
  }, [message.id, targetLanguage]);

  const presentation = useMemo(
    () =>
      resolveMessagePresentation(
        message,
        targetLanguage,
        enabled,
        showOriginal
      ),
    [enabled, message, showOriginal, targetLanguage]
  );

  const renderedMessage = useMemo(
    () => ({ ...message, body: presentation.body }),
    [message, presentation.body]
  );

  const canToggle = Boolean(
    !message.isMine &&
      enabled &&
      presentation.translationAvailable &&
      presentation.sourceLanguage &&
      !isSameLanguage(presentation.sourceLanguage, targetLanguage)
  );

  return (
    <View style={styles.container}>
      <MessageBubble
        {...props}
        message={renderedMessage}
        onReply={
          props.onReply
            ? () => props.onReply?.(message)
            : undefined
        }
        onReact={
          props.onReact
            ? (_rendered, emoji) => props.onReact?.(message, emoji)
            : undefined
        }
        onVotePoll={
          props.onVotePoll
            ? (_rendered, optionId) => props.onVotePoll?.(message, optionId)
            : undefined
        }
      />

      {canToggle ? (
        <View
          style={[
            styles.translationMeta,
            centered ? styles.centeredMeta : styles.otherMeta
          ]}
        >
          <Text style={styles.translationLabel}>
            {showOriginal
              ? "Message original"
              : `Traduit de ${getLanguageFrenchName(presentation.sourceLanguage).toLocaleLowerCase("fr")}`}
          </Text>
          <Text style={styles.separator}>·</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showOriginal
                ? "Afficher la traduction"
                : "Afficher le message original"
            }
            onPress={() => setShowOriginal((current) => !current)}
            style={styles.toggleTarget}
          >
            <Text style={styles.toggleText}>
              {showOriginal ? "Voir la traduction" : "Voir l’original"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  translationMeta: {
    minHeight: 32,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4
  },
  otherMeta: { marginLeft: 56 + spacing.sm },
  centeredMeta: { justifyContent: "center", marginHorizontal: spacing.md },
  translationLabel: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700"
  },
  separator: { color: colors.textMuted, fontSize: 11 },
  toggleTarget: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 4
  },
  toggleText: {
    color: colors.violet,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900"
  }
});
