export type CoworkingActionFeedback = {
  id: number;
  type: "hello" | "knock";
  message: string;
};

type Listener = (feedback: CoworkingActionFeedback) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function emitCoworkingActionFeedback(
  feedback: Omit<CoworkingActionFeedback, "id">
): void {
  const event = { ...feedback, id: nextId++ };
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      // Le retour visuel ne doit jamais interrompre l’action réseau principale.
    }
  }
}

export function subscribeCoworkingActionFeedback(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
