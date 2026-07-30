import type { ChatMessage } from "../types/messaging";

export const MAX_MESSAGE_IDENTITY_KEYS = 20_000;

export function getMessageIdentityKeys(
  message: Pick<ChatMessage, "id" | "clientMessageId">
): string[] {
  const keys = [`id:${message.id}`];
  if (message.clientMessageId) keys.push(`client:${message.clientMessageId}`);
  return keys;
}

export function hasKnownMessage(
  knownKeys: ReadonlySet<string>,
  message: Pick<ChatMessage, "id" | "clientMessageId">
): boolean {
  return getMessageIdentityKeys(message).some((key) => knownKeys.has(key));
}

function trimKnownKeys(knownKeys: Set<string>): void {
  while (knownKeys.size > MAX_MESSAGE_IDENTITY_KEYS) {
    const oldest = knownKeys.values().next().value as string | undefined;
    if (!oldest) return;
    knownKeys.delete(oldest);
  }
}

export function rememberMessage(
  knownKeys: Set<string>,
  message: Pick<ChatMessage, "id" | "clientMessageId">
): void {
  for (const key of getMessageIdentityKeys(message)) {
    if (knownKeys.has(key)) knownKeys.delete(key);
    knownKeys.add(key);
  }
  trimKnownKeys(knownKeys);
}

export function rememberMessages(
  knownKeys: Set<string>,
  messages: readonly Pick<ChatMessage, "id" | "clientMessageId">[]
): void {
  for (const message of messages) rememberMessage(knownKeys, message);
}
