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

import { env } from "../config/env";
import {
  contentTranslationTargetsViewer,
  hasTranslatedContentField,
  hasTranslatedPoll,
  translatedContentField,
  translatedPollOption,
  translatedPollQuestion,
  translationSourceLabel
} from "../i18n/contentTranslation";
import { mockContentTranslation, mockPollTranslation } from "../i18n/mockContentLookup";
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

  const bodyTranslation = contentTranslationTargetsViewer(message.translation, viewerLanguage)
    ? message.translation
    : env.mockMode
      ? mockContentTranslation(message.body, "body", message.sourceLanguage ?? "fr")
      : message.translation;
  const replyTranslation = message.replyPreview
    ? contentTranslationTargetsViewer(message.replyPreview.translation, viewerLanguage)
      ? message.replyPreview.translation
      : env.mockMode
        ? mockContentTranslation(
            message.replyPreview.body,
            "body",
            message.replyPreview.sourceLanguage ?? "fr"
          )
        : message.replyPreview.translation
    : undefined;
  const pollTranslation = message.poll
    ? contentTranslationTargetsViewer(message.poll.translation, viewerLanguage)
      ? message.poll.translation
      : env.mockMode
        ? mockPollTranslation(message.poll)
        : message.poll.translation
    : undefined;

  const translatedBody = translatedContentField(
    message.body,
    bodyTranslation,
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
            replyTranslation,
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
          pollTranslation,
          viewerLanguage,
          showOriginal
        ),
        options: message.poll.options.map((option, index) => ({
          ...option,
          label: translatedPollOption(
            option.id,
            index,
            option.label,
            pollTranslation,
            viewerLanguage,
            showOriginal
          )
        }))
      }
    : undefined;

  const translatedAttachments = message.attachments?.map((attachment) => {
    const transcriptTranslation = attachment.transcript && env.mockMode &&
      !contentTranslationTargetsViewer(attachment.transcriptTranslation, viewerLanguage)
      ? mockContentTranslation(attachment.transcript, "transcript")
      : attachment.transcriptTranslation;
    return {
      ...attachment,
      transcript: attachment.transcript
        ? translatedContentField(
            attachment.transcript,
            transcriptTranslation,
            "transcript",
            viewerLanguage,
            showOriginal
          ) ?? attachment.transcript
        : attachment.transcript
    };
  });

  const translationReady = Boolean(
    hasTranslatedContentField(message.body, bodyTranslation, "body", viewerLanguage) ||
      (message.replyPreview &&
        hasTranslatedContentField(
          message.replyPreview.body,
          replyTranslation,
          "body",
          viewerLanguage
        )) ||
      (message.poll &&
        hasTranslatedPoll(
          message.poll.question,
          message.poll.options,
          pollTranslation,
          viewerLanguage
        )) ||
      message.attachments?.some((attachment) => {
        if (!attachment.transcript) return false;
        const translation = contentTranslationTargetsViewer(attachment.transcriptTranslation, viewerLanguage)
          ? attachment.transcriptTranslation
          : env.mockMode
            ? mockContentTranslation(attachment.transcript, "transcript")
            : attachment.transcriptTranslation;
        return hasTranslatedContentField(
          attachment.transcript,
          translation,
          "transcript",
          viewerLanguage
        );
      })
  );

  const sourceTranslation =
    bodyTranslation ??
    pollTranslation ??
    replyTranslation ??
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
    minHeight: 44,
    marginTop: -spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4
  },
  otherMeta: { marginLeft: 56 + spacing.sm },
  centeredMeta: { justifyContent: "center", marginHorizontal: spacing.md },
  translationLabel: { color: theme.pageTextMuted, fontSize: 11, lineHeight: 15, fontWeight: "700" },
  separator: { color: theme.pageTextMuted, fontSize: 11 },
  toggleTarget: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6, paddingVertical: 6 },
  toggleText: { color: theme.violet, fontSize: 11, lineHeight: 15, fontWeight: "900" }
});
