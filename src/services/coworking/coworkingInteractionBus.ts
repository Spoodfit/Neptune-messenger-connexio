export type CoworkingInteractionEvent =
  | {
      type: "hello";
      fromUserId: string;
      receivedAt: string;
    }
  | {
      type: "knock";
      requestId: string;
      fromUserId: string;
      spaceId: string;
      receivedAt: string;
    }
  | {
      type: "knock-resolved";
      requestId: string;
      status: "accepted" | "declined";
      spaceId?: string;
      receivedAt: string;
    };

type Listener = (event: CoworkingInteractionEvent) => void;

const listeners = new Set<Listener>();

export function emitCoworkingInteraction(event: CoworkingInteractionEvent): void {
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      // Une notification sociale ne doit jamais interrompre le temps réel global.
    }
  }
}

export function subscribeCoworkingInteractions(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
