import { getCurrentUiLocaleTag } from "../i18n/uiLocale";

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function timeFormatter() {
  return new Intl.DateTimeFormat(getCurrentUiLocaleTag(), {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function dayFormatter() {
  return new Intl.DateTimeFormat(getCurrentUiLocaleTag(), {
    weekday: "short"
  });
}

export function formatMessageTime(value: string): string {
  const date = parseDate(value);
  return date ? timeFormatter().format(date) : "Heure inconnue";
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

  if (sameDay) return timeFormatter().format(date);
  return dayFormatter().format(date).replace(".", "");
}
