export interface SessionRuntimeHandlers {
  getAccessToken: () => Promise<string | null>;
  refreshAccessToken: () => Promise<string | null>;
}

let activeHandlers: SessionRuntimeHandlers | null = null;

export function configureSessionRuntime(
  handlers: SessionRuntimeHandlers
): () => void {
  activeHandlers = handlers;
  return () => {
    if (activeHandlers === handlers) activeHandlers = null;
  };
}

export async function resolveSessionAccessToken(
  fallbackToken?: string | null
): Promise<string | null> {
  if (!activeHandlers) return fallbackToken ?? null;
  return (await activeHandlers.getAccessToken()) ?? fallbackToken ?? null;
}

export async function refreshSessionAccessToken(): Promise<string | null> {
  if (!activeHandlers) return null;
  return activeHandlers.refreshAccessToken();
}

export function resetSessionRuntimeForTests(): void {
  activeHandlers = null;
}
