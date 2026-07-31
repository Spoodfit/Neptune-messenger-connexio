from pathlib import Path

# Déclenchement contrôlé du transport média.
path = Path("src/providers/MessagingProvider.tsx")
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one occurrence, found {count}: {old[:80]!r}")
    text = text.replace(old, new, 1)


replace_once(
    'import type { ChatMessage, Conversation } from "../types/messaging";',
    'import type {\n  ChatMessage,\n  Conversation,\n  MessageAttachment\n} from "../types/messaging";'
)

replace_once(
'''  sendMessage: (
    conversationId: string,
    body: string,
    replyToMessageId?: string
  ) => Promise<boolean>;''',
'''  sendMessage: (
    conversationId: string,
    body: string,
    replyToMessageId?: string,
    attachments?: MessageAttachment[],
    mentionedUserIds?: string[]
  ) => Promise<boolean>;'''
)

replace_once(
'''                isMine: true,
                replyToMessageId: item.replyToMessageId
              };''',
'''                isMine: true,
                replyToMessageId: item.replyToMessageId,
                attachments: item.attachments,
                mentionedUserIds: item.mentionedUserIds
              };'''
)

replace_once(
'''                clientMessageId: item.clientMessageId,
                body: item.body,
                replyToMessageId: item.replyToMessageId
              });''',
'''                clientMessageId: item.clientMessageId,
                body: item.body,
                replyToMessageId: item.replyToMessageId,
                attachments: item.attachments,
                mentionedUserIds: item.mentionedUserIds
              });'''
)

replace_once(
'''            body: item.body,
            createdAt: item.createdAt,
            replyToMessageId: item.replyToMessageId
          });''',
'''            body: item.body,
            createdAt: item.createdAt,
            replyToMessageId: item.replyToMessageId,
            attachments: item.attachments,
            mentionedUserIds: item.mentionedUserIds
          });'''
)

replace_once(
'''      conversationId: string,
      body: string,
      replyToMessageId?: string
    ): Promise<boolean> => {''',
'''      conversationId: string,
      body: string,
      replyToMessageId?: string,
      attachments: MessageAttachment[] = [],
      mentionedUserIds: string[] = []
    ): Promise<boolean> => {'''
)

replace_once(
'''      if (!cleanBody) return false;
      if (cleanBody.length > 4_000) {''',
'''      if (!cleanBody && attachments.length === 0) return false;
      if (cleanBody.length > 4_000) {'''
)

replace_once(
'''        body: cleanBody,
        createdAt,
        replyToMessageId
      });''',
'''        body: cleanBody,
        createdAt,
        replyToMessageId,
        attachments,
        mentionedUserIds
      });'''
)

replace_once(
'''        body: cleanBody,
        replyToMessageId,
        createdAt,''',
'''        body: cleanBody,
        replyToMessageId,
        attachments,
        mentionedUserIds,
        createdAt,'''
)

replace_once(
'''            ? { ...item, lastMessage: cleanBody, lastMessageAt: createdAt }
            : item''',
'''            ? {
                ...item,
                lastMessage:
                  cleanBody ||
                  (attachments.length === 1
                    ? `📎 ${attachments[0]?.name ?? "Pièce jointe"}`
                    : `📎 ${attachments.length} pièces jointes`),
                lastMessageAt: createdAt
              }
            : item'''
)

path.write_text(text)
