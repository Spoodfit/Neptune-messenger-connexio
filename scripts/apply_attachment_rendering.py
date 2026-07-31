from pathlib import Path

# [attachment-rendering] déclenchement contrôlé.
path = Path("src/components/MessageBubble.tsx")
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one occurrence, found {count}: {old[:100]!r}")
    text = text.replace(old, new, 1)

replace_once(
    'import { colors, gradients, radii, spacing, typography } from "../theme";',
    'import { colors, gradients, radii, spacing, typography } from "../theme";\nimport { MessageAttachmentView } from "./MessageAttachmentView";'
)

start = text.index('const attachmentIcon = (kind: string) => {')
end = text.index('\n\nexport function MessageBubble', start)
text = text[:start] + text[end+2:]

old = '''      {message.attachments?.map((attachment) => (
        <View key={attachment.id} style={styles.attachment}>
          <View style={styles.attachmentIcon}>
            <Ionicons
              name={attachmentIcon(attachment.kind)}
              size={21}
              color={message.isMine ? colors.white : colors.orange}
            />
          </View>
          <View style={styles.attachmentContent}>
            <Text
              numberOfLines={1}
              style={[
                styles.attachmentName,
                message.isMine ? styles.mineBody : styles.otherBody
              ]}
            >
              {attachment.name}
            </Text>
            <Text
              style={[
                styles.attachmentMeta,
                message.isMine ? styles.mineTime : styles.otherTime
              ]}
            >
              {attachment.status === "uploading"
                ? `${Math.round((attachment.uploadProgress ?? 0) * 100)} %`
                : attachment.kind.toLocaleUpperCase("fr")}
            </Text>
          </View>
        </View>
      ))}'''
new = '''      {message.attachments?.map((attachment) => (
        <MessageAttachmentView
          key={attachment.id}
          attachment={attachment}
          isMine={message.isMine}
        />
      ))}'''
replace_once(old, new)

path.write_text(text)
