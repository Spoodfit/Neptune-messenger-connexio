from pathlib import Path

# Déclenchement contrôlé de la finalisation du chat.
path = Path("app/chat/[id].tsx")
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one occurrence, found {count}: {old[:100]!r}")
    text = text.replace(old, new, 1)


replace_once(
'''import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MessageBubble }''',
'''import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MessageBubble }'''
)

replace_once(
'''import { useSession } from "../../src/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "../../src/theme";''',
'''import { useSession } from "../../src/providers/SessionProvider";
import { env } from "../../src/config/env";
import { uploadMessageAttachment } from "../../src/services/api/uploadApi";
import { pickMessageAttachment } from "../../src/services/media/mediaPicker";
import { colors, gradients, radii, spacing, typography } from "../../src/theme";'''
)

replace_once(
'''  AttachmentKind,
  ChatMessage,
  Conversation
} from "../../src/types/messaging";''',
'''  AttachmentKind,
  ChatMessage,
  Conversation,
  MessageAttachment
} from "../../src/types/messaging";'''
)

replace_once(
'''  { kind: "location", label: "Localisation", icon: "location-outline" },
  { kind: "contact", label: "Contact", icon: "person-add-outline" }
];''',
'''  { kind: "location", label: "Localisation", icon: "location-outline" }
];'''
)

replace_once(
'''  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ kind: AttachmentKind; label: string }>
  >([]);''',
'''  const [pendingAttachments, setPendingAttachments] = useState<
    MessageAttachment[]
  >([]);'''
)

insert_at = text.index("  const submit = () => {")
picker_code = '''  const addAttachment = async (kind: AttachmentKind) => {
    setAttachmentMenuOpen(false);
    try {
      const picked = await pickMessageAttachment(kind);
      if (!picked) return;
      setPendingAttachments((previous) => {
        const maxAttachments = 10;
        if (previous.length >= maxAttachments) {
          Alert.alert(
            "Limite atteinte",
            `Un message accepte au maximum ${maxAttachments} pièces jointes.`
          );
          return previous;
        }
        return [...previous, picked];
      });
    } catch (error) {
      Alert.alert(
        "Pièce jointe indisponible",
        error instanceof Error
          ? error.message
          : "Le contenu sélectionné n’a pas pu être ajouté."
      );
    }
  };

  const resolveMentionedUserIds = (value: string): string[] => {
    const normalized = value.toLocaleLowerCase("fr");
    return members
      .filter((member) => {
        const firstName = member.name.split(" ")[0]?.toLocaleLowerCase("fr") ?? "";
        return (
          (firstName && normalized.includes(`@${firstName}`)) ||
          normalized.includes(`@${member.name.toLocaleLowerCase("fr")}`) ||
          (member.company &&
            normalized.includes(`@${member.company.toLocaleLowerCase("fr")}`))
        );
      })
      .map((member) => member.id);
  };

'''
text = text[:insert_at] + picker_code + text[insert_at:]

start = text.index("  const submit = () => {")
end = text.index("\n\n  const connectionLabel", start)
new_submit = '''  const submit = () => {
    if (submitLockRef.current || submitting) return;
    const body = draft.trim();
    if (!conversation.canPost || (!body && pendingAttachments.length === 0)) return;

    submitLockRef.current = true;
    setSubmitting(true);
    const originalDraft = draft;
    const originalAttachments = pendingAttachments;
    const originalReply = replyingTo;
    const mentionedUserIds = resolveMentionedUserIds(body);

    void (async () => {
      try {
        const readyAttachments: MessageAttachment[] = [];
        for (let index = 0; index < originalAttachments.length; index += 1) {
          const attachment = originalAttachments[index]!;
          if (env.mockMode || localOnly || attachment.status === "ready") {
            readyAttachments.push({
              ...attachment,
              status: "ready",
              uploadProgress: 1
            });
            continue;
          }
          setPendingAttachments((previous) =>
            previous.map((item) =>
              item.id === attachment.id
                ? { ...item, status: "uploading", uploadProgress: 0 }
                : item
            )
          );
          const uploaded = await uploadMessageAttachment(
            attachment,
            undefined,
            (progress) =>
              setPendingAttachments((previous) =>
                previous.map((item) =>
                  item.id === attachment.id
                    ? { ...item, status: "uploading", uploadProgress: progress }
                    : item
                )
              )
          );
          readyAttachments.push(uploaded);
        }

        const fallbackBody =
          body ||
          (readyAttachments.length === 1
            ? `📎 ${readyAttachments[0]?.name ?? "Pièce jointe"}`
            : `📎 ${readyAttachments.length} pièces jointes`);
        const accepted =
          source === "admin"
            ? await sendCreatedGroupMessage(
                conversation.id,
                fallbackBody,
                originalReply ?? undefined,
                readyAttachments,
                mentionedUserIds
              )
            : source === "private"
              ? await sendLocalMessage(
                  conversation.id,
                  fallbackBody,
                  originalReply ?? undefined,
                  readyAttachments,
                  mentionedUserIds
                )
              : await sendMessage(
                  conversation.id,
                  fallbackBody,
                  originalReply?.id,
                  readyAttachments,
                  mentionedUserIds
                );
        if (!accepted) throw new Error("Le message a été refusé.");
        if (mountedRef.current) {
          setDraft("");
          setPendingAttachments([]);
          setReplyingTo(null);
        }
      } catch (error) {
        if (mountedRef.current) {
          setDraft((current) => current || originalDraft);
          setPendingAttachments((current) =>
            current.length > 0 ? current : originalAttachments
          );
          setReplyingTo(originalReply);
          Alert.alert(
            "Envoi impossible",
            error instanceof Error
              ? error.message
              : "Le message n’a pas pu être envoyé."
          );
        }
      } finally {
        submitLockRef.current = false;
        if (mountedRef.current) setSubmitting(false);
      }
    })();
  };'''
text = text[:start] + new_submit + text[end:]

replace_once(
'''              onPress={() =>
                Alert.alert(
                  "Appel audio",
                  "Écran prêt. Le développeur doit brancher WebRTC ou le fournisseur d’appel."
                )
              }''',
'''              onPress={() =>
                router.push({
                  pathname: "/call/[id]",
                  params: { id: conversation.id, mode: "audio" }
                })
              }'''
)

replace_once(
'''              onPress={() =>
                Alert.alert(
                  "Appel vidéo",
                  "Écran prêt. Le développeur doit brancher WebRTC ou le fournisseur d’appel."
                )
              }''',
'''              onPress={() =>
                router.push({
                  pathname: "/call/[id]",
                  params: { id: conversation.id, mode: "video" }
                })
              }'''
)

replace_once(
'''                  onPress={() => {
                    setPendingAttachments((previous) => [
                      ...previous,
                      { kind: attachment.kind, label: attachment.label }
                    ]);
                    setAttachmentMenuOpen(false);
                  }}''',
'''                  onPress={() => void addAttachment(attachment.kind)}'''
)

replace_once(
'''            <Text style={styles.backendHint}>
              Les pickers natifs, la compression, la progression et l’upload privé sont prêts à être branchés sur ces actions.
            </Text>''',
'''            <Text style={styles.backendHint}>
              Les contenus sont sélectionnés depuis l’appareil puis envoyés vers le stockage privé Neptune avec progression et reprise en cas d’échec.
            </Text>'''
)

replace_once(
'''                  <Text style={styles.pendingText}>{attachment.label}</Text>''',
'''                  <Text style={styles.pendingText} numberOfLines={1}>
                    {attachment.name}
                    {attachment.status === "uploading"
                      ? ` · ${Math.round((attachment.uploadProgress ?? 0) * 100)} %`
                      : ""}
                  </Text>'''
)

path.write_text(text)
