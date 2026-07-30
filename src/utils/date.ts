const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit"
});

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short"
});

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatMessageTime(value: string): string {
  const date = parseDate(value);
  return date ? timeFormatter.format(date) : "Heure inconnue";
}

export function formatConversationTime(value?: string): string {
  if (!value) return "";
  const date = parseDate(value);
  if (!date) return "";

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
