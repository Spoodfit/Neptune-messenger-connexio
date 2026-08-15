import { Text } from "@/components/LocalizedText";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  Pressable,
  StyleSheet,
  View
} from "react-native";

import {
  hasTranslatedContentField,
  hasTranslatedPoll,
  translatedContentField,
  translatedPollOption,
  translatedPollQuestion,
  translationSourceLabel
} from "../i18n/contentTranslation";
import { getTranslationRequestLanguage } from "../i18n/translationLocale";
import { spacing } from "../theme";
import { MessageBubble as BaseMessageBubble } from "./BaseMessageBubble";
import { useAppTheme } from "@/providers/ThemeProvider";

type MessageBubbleProps = ComponentProps<typeof BaseMessageBubble>;

export function MessageBubble(props: MessageBubbleProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { message, centered = false } = props;
  const [showOriginal, setShowOriginal] = useState(false);
  const viewerLanguage = getTranslationRequestLanguage();

  const translatedBody = translatedContentField(
    message.body,
    message.translation,
    "body",
    viewerLanguage,
    showOriginal
  ) ?? message.body;

  const translatedReplyPreview = message.replyPreview
    ? {
        ...message.replyPreview,
        body:
          translatedContentField(
            message.replyPreview.body,
            message.replyPreview.translation,
            "body",
            viewerLanguage,
            showOriginal
          ) ?? message.replyPreview.body
      }
    : undefined;

  const translatedPoll = message.poll
    ? {
        ...message.poll,
        question: translatedPollQuestion(
          message.poll.question,
          message.poll.translation,
          viewerLanguage,
          showOriginal
        ),
        options: message.poll.options.map((option, index) => ({
          ...option,
          label: translatedPollOption(
            option.id,
            index,
            option.label,
            message.poll?.translation,
            viewerLanguage,
            showOriginal
          )
        }))
      }
    : undefined;

  const translatedAttachments = message.attachments?.map((attachment) => ({
    ...attachment,
    transcript: attachment.transcript
      ? translatedContentField(
          attachment.transcript,
          attachment.transcriptTranslation,
          "transcript",
          viewerLanguage,
          showOriginal
        ) ?? attachment.transcript
      : attachment.transcript
  }));

  const translationReady = Boolean(
    hasTranslatedContentField(message.body, message.translation, "body", viewerLanguage) ||
      (message.replyPreview &&
        hasTranslatedContentField(
          message.replyPreview.body,
          message.replyPreview.translation,
          "body",
          viewerLanguage
        )) ||
      (message.poll &&
        hasTranslatedPoll(
          message.poll.question,
          message.poll.options,
          message.poll.translation,
          viewerLanguage
        )) ||
      message.attachments?.some((attachment) =>
        attachment.transcript
          ? hasTranslatedContentField(
              attachment.transcript,
              attachment.transcriptTranslation,
              "transcript",
              viewerLanguage
            )
          : false
      )
  );

  const sourceTranslation =
    message.translation ??
    message.poll?.translation ??
    message.replyPreview?.translation ??
    message.attachments?.find((attachment) => attachment.transcriptTranslation)
      ?.transcriptTranslation;

  useEffect(() => {
    setShowOriginal(false);
  }, [message.id, viewerLanguage, sourceTranslation?.generatedAt]);

  const renderedMessage = useMemo(
    () => ({
      ...message,
      body: translatedBody,
      replyPreview: translatedReplyPreview,
      poll: translatedPoll,
      attachments: translatedAttachments
    }),
    [message, translatedAttachments, translatedBody, translatedPoll, translatedReplyPreview]
  );

  const sourceLabel = translationSourceLabel(sourceTranslation);

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
            {showOriginal ? "Contenu original" : `Traduit de ${sourceLabel}`}
          </Text>
          <Text style={styles.separator}>·</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showOriginal ? "Afficher la traduction" : "Afficher le contenu original"}
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

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
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
  translationLabel: { color: theme.pageTextMuted, fontSize: 11, lineHeight: 15, fontWeight: "700" },
  separator: { color: theme.pageTextMuted, fontSize: 11 },
  toggleTarget: { minHeight: 32, justifyContent: "center", paddingHorizontal: 4 },
  toggleText: { color: theme.violet, fontSize: 11, lineHeight: 15, fontWeight: "900" }
});
