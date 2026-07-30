const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit"
});

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short"
});

export function formatMessageTime(value: string): string {
  return timeFormatter.format(new Date(value));
}

export function formatConversationTime(value?: string): string {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return timeFormatter.format(date);
  }

  return dayFormatter.format(date).replace(".", "");
}
