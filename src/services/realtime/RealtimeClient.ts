import type { ChatMessage } from "@/types/messaging";

export type RealtimeEvent =
  | {
      type: "message.created";
      payload: ChatMessage;
    }
  | {
      type: "message.updated";
      payload: ChatMessage;
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
      payload: {
        userId: string;
        online: boolean;
      };
    };

interface RealtimeClientOptions {
  url: string;
  token: string;
  onEvent: (event: RealtimeEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByClient = false;

  constructor(private readonly options: RealtimeClientOptions) {}

  connect(): void {
    this.closedByClient = false;
    this.openSocket();
  }

  disconnect(): void {
    this.closedByClient = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket?.close();
    this.socket = null;
  }

  private openSocket(): void {
    const separator = this.options.url.includes("?") ? "&" : "?";
    const url = `${this.options.url}${separator}token=${encodeURIComponent(
      this.options.token
    )}`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.options.onConnectionChange?.(true);
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeEvent;
        this.options.onEvent(parsed);
      } catch {
        // Un événement mal formé ne doit pas couper la connexion.
      }
    };

    this.socket.onerror = () => {
      this.options.onConnectionChange?.(false);
    };

    this.socket.onclose = () => {
      this.options.onConnectionChange?.(false);
      this.socket = null;

      if (!this.closedByClient) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    const delay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }
}
