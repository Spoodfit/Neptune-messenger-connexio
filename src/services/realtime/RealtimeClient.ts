import type { ChatMessage } from "../../types/messaging";

export type RealtimeEvent =
  | { type: "message.created"; payload: ChatMessage }
  | { type: "message.updated"; payload: ChatMessage }
  | {
      type: "message.deleted";
      payload: { conversationId: string; messageId: string };
    }
  | {
      type: "conversation.read";
      payload: {
        conversationId: string;
        userId: string;
        lastReadMessageId: string;
      };
    }
  | {
      type: "presence.changed";
      payload: { userId: string; online: boolean };
    }
  | {
      type: "conversation.membership.changed";
      payload: { conversationId: string; active: boolean };
    };

interface RealtimeClientOptions {
  url: string;
  ticketProvider: () => Promise<string>;
  onEvent: (event: RealtimeEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
  random?: () => number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (!isRecord(value) || typeof value.type !== "string" || !("payload" in value)) {
    return false;
  }
  return [
    "message.created",
    "message.updated",
    "message.deleted",
    "conversation.read",
    "presence.changed",
    "conversation.membership.changed"
  ].includes(value.type);
}

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByClient = false;
  private generation = 0;

  constructor(private readonly options: RealtimeClientOptions) {}

  connect(): void {
    if (this.socket) return;
    this.closedByClient = false;
    this.generation += 1;
    void this.openSocket(this.generation);
  }

  disconnect(): void {
    this.closedByClient = true;
    this.generation += 1;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.options.onConnectionChange?.(false);
  }

  private async openSocket(generation: number): Promise<void> {
    try {
      const ticket = await this.options.ticketProvider();
      if (this.closedByClient || generation !== this.generation) return;
      const separator = this.options.url.includes("?") ? "&" : "?";
      const url = `${this.options.url}${separator}ticket=${encodeURIComponent(ticket)}`;
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        if (socket !== this.socket) return;
        this.reconnectAttempt = 0;
        this.options.onConnectionChange?.(true);
      };

      socket.onmessage = (event) => {
        try {
          const parsed: unknown = JSON.parse(String(event.data));
          if (isRealtimeEvent(parsed)) this.options.onEvent(parsed);
        } catch {
          // Un événement invalide est ignoré sans interrompre la connexion.
        }
      };

      socket.onerror = () => {
        if (socket === this.socket) this.options.onConnectionChange?.(false);
      };

      socket.onclose = () => {
        if (socket !== this.socket) return;
        this.options.onConnectionChange?.(false);
        this.socket = null;
        if (!this.closedByClient) this.scheduleReconnect();
      };
    } catch {
      this.options.onConnectionChange?.(false);
      if (!this.closedByClient) this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.closedByClient) return;
    const random = this.options.random ?? Math.random;
    const base = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt);
    const delay = base + Math.floor(base * 0.2 * random());
    this.reconnectAttempt += 1;
    const generation = this.generation;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.openSocket(generation);
    }, delay);
  }
}
