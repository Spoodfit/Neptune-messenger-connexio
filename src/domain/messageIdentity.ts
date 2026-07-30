import type { ChatMessage } from "../types/messaging";

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

export function rememberMessage(
  knownKeys: Set<string>,
  message: Pick<ChatMessage, "id" | "clientMessageId">
): void {
  for (const key of getMessageIdentityKeys(message)) knownKeys.add(key);
}

export function rememberMessages(
  knownKeys: Set<string>,
  messages: readonly Pick<ChatMessage, "id" | "clientMessageId">[]
): void {
  for (const message of messages) rememberMessage(knownKeys, message);
}
