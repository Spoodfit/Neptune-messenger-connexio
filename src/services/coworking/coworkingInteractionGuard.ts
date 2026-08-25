export type CoworkingGuardedAction = "hello" | "knock";

const COOLDOWNS_MS: Record<CoworkingGuardedAction, number> = {
  hello: 30_000,
  knock: 60_000
};

const outgoingReservations = new Map<string, number>();
const incomingSignals = new Map<string, number>();

function actionKey(action: CoworkingGuardedAction, targetKey: string): string {
  return `${action}:${targetKey.trim()}`;
}

function prune(store: Map<string, number>, now: number): void {
  for (const [key, expiresAt] of store) {
    if (expiresAt <= now) store.delete(key);
  }
}

export function interactionCooldownRemaining(
  action: CoworkingGuardedAction,
  targetKey: string,
  now = Date.now()
): number {
  prune(outgoingReservations, now);
  return Math.max(0, (outgoingReservations.get(actionKey(action, targetKey)) ?? 0) - now);
}

export function reserveCoworkingInteraction(
  action: CoworkingGuardedAction,
  targetKey: string,
  now = Date.now()
): { allowed: true } | { allowed: false; remainingMs: number } {
  const remainingMs = interactionCooldownRemaining(action, targetKey, now);
  if (remainingMs > 0) return { allowed: false, remainingMs };
  outgoingReservations.set(actionKey(action, targetKey), now + COOLDOWNS_MS[action]);
  return { allowed: true };
}

export function releaseCoworkingInteraction(
  action: CoworkingGuardedAction,
  targetKey: string
): void {
  outgoingReservations.delete(actionKey(action, targetKey));
}

export function acceptIncomingCoworkingInteraction(
  action: CoworkingGuardedAction,
  sourceKey: string,
  now = Date.now()
): boolean {
  prune(incomingSignals, now);
  const key = actionKey(action, sourceKey);
  if ((incomingSignals.get(key) ?? 0) > now) return false;
  incomingSignals.set(key, now + COOLDOWNS_MS[action]);
  return true;
}

export function resetCoworkingInteractionGuard(): void {
  outgoingReservations.clear();
  incomingSignals.clear();
}
