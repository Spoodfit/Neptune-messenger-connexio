import type { AppUser, ChatMessage } from "../types/messaging";

const normalize = (value: string) =>
  value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const unique = (items: string[]) => [...new Set(items)].slice(0, 3);

export function buildSmartReplySuggestions(
  message: ChatMessage | undefined,
  currentUser: Pick<AppUser, "id" | "name" | "company">
): string[] {
  if (!message || message.isMine || !message.body.trim()) return [];

  const body = normalize(message.body);
  const firstName = currentUser.name.split(" ")[0] ?? currentUser.name;
  const mentionTokens = [firstName, currentUser.name, currentUser.company]
    .filter(Boolean)
    .map((value) => `@${normalize(value)}`);
  const mentioned =
    message.mentionedUserIds?.includes(currentUser.id) ||
    mentionTokens.some((token) => body.includes(token));
  const replies: string[] = [];

  if (mentioned) {
    replies.push(
      "Je viens de voir ta mention — je m’en occupe.",
      "Bien reçu, je te réponds juste après.",
      "Tu as besoin de quoi précisément ?"
    );
  }

  if (/\?|qui |quoi |quand |comment |pourquoi |est-ce|peux-tu|pouvez-vous/.test(body)) {
    replies.push(
      "Oui, je regarde ça.",
      "Je te réponds dans quelques minutes.",
      "Peux-tu me donner un peu plus de détails ?"
    );
  }

  if (/rdv|rendez-vous|creneau|dispo|disponible|agenda|heure|demain|vendredi|lundi/.test(body)) {
    replies.push(
      "Oui, c’est bon pour moi.",
      "Je vérifie mon agenda.",
      "Propose-moi deux créneaux."
    );
  }

  if (/merci|top|parfait|super|bravo/.test(body)) {
    replies.push("Avec plaisir !", "Merci à toi 🙌", "Parfait, on avance.");
  }

  if (/bonjour|salut|hello|coucou|bonsoir/.test(body)) {
    replies.push("Salut ! Comment vas-tu ?", "Bonjour 👋", "Ravi de te lire.");
  }

  return unique(replies);
}
