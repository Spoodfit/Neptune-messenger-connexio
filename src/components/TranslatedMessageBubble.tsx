import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getLanguageFrenchName, isSameLanguage } from "../i18n/languages";
import { getTranslationRequestLanguage } from "../i18n/translationLocale";
import { colors, spacing } from "../theme";
import { MessageBubble as BaseMessageBubble } from "./BaseMessageBubble";

type MessageBubbleProps = ComponentProps<typeof BaseMessageBubble>;

export function MessageBubble(props: MessageBubbleProps) {
  const { message, centered = false } = props;
  const [showOriginal, setShowOriginal] = useState(false);
  const translation = message.translation;
  const translatedBody = translation?.body?.trim() ?? "";
  const viewerLanguage = getTranslationRequestLanguage();
  const translationTargetsViewer = Boolean(
    !translation?.targetLanguage ||
      isSameLanguage(translation.targetLanguage, viewerLanguage)
  );
  const translationReady = Boolean(
    !message.isMine &&
      translationTargetsViewer &&
      translation?.status === "ready" &&
      translatedBody &&
      translatedBody !== message.body.trim()
  );

  useEffect(() => {
    setShowOriginal(false);
  }, [message.id, translation?.targetLanguage, translatedBody]);

  const renderedMessage = useMemo(
    () => ({
      ...message,
      body: translationReady && !showOriginal ? translatedBody : message.body
    }),
    [message, showOriginal, translatedBody, translationReady]
  );

  const sourceLabel = translation?.sourceLanguage
    ? getLanguageFrenchName(translation.sourceLanguage).toLocaleLowerCase("fr")
    : "la langue d’origine";

  return (
    <View style={styles.container}>
      <BaseMessageBubble
        {...props}
        message={renderedMessage}
        onReply={props.onReply ? () => props.onReply?.(message) : undefined}
        onReact={props.onReact ? (_rendered, emoji) => props.onReact?.(message, emoji) : undefined}
        onVotePoll={props.onVotePoll ? (_rendered, optionId) => props.onVotePoll?.(message, optionId) : undefined}
      />

      {translationReady ? (
        <View style={[styles.translationMeta, centered ? styles.centeredMeta : styles.otherMeta]}>
          <Text style={styles.translationLabel}>
            {showOriginal ? "Message original" : `Traduit de ${sourceLabel}`}
          </Text>
          <Text style={styles.separator}>·</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showOriginal ? "Afficher la traduction" : "Afficher le message original"}
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
  translationLabel: { color: colors.textMuted, fontSize: 11, lineHeight: 15, fontWeight: "700" },
  separator: { color: colors.textMuted, fontSize: 11 },
  toggleTarget: { minHeight: 32, justifyContent: "center", paddingHorizontal: 4 },
  toggleText: { color: colors.violet, fontSize: 11, lineHeight: 15, fontWeight: "900" }
});