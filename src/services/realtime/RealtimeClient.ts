import {
  normalizeRealtimeEvent,
  type RealtimeEvent
} from "./realtimeEvents";
import { buildSocketIoWebSocketUrl } from "../../domain/realtimeTransport";
import { emitCoworkingInteraction } from "../coworking/coworkingInteractionBus";

export type { RealtimeEvent } from "./realtimeEvents";

interface RealtimeClientOptions {
  url: string;
  ticketProvider: () => Promise<string>;
  onEvent: (event: RealtimeEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
  random?: () => number;
  connectionTimeoutMs?: number;
}

function asSocketEventPayload(eventName: string, payload: unknown): unknown {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    return "type" in record ? record : { type: eventName, ...record };
  }
  return { type: eventName, payload };
}

function broadcastCoworkingInteraction(event: RealtimeEvent): void {
  if (event.type === "coworking.hello") {
    emitCoworkingInteraction({
      type: "hello",
      fromUserId: event.payload.fromUserId,
      spaceId: event.payload.spaceId,
      receivedAt: new Date().toISOString()
    });
    return;
  }
  if (event.type === "coworking.knock") {
    emitCoworkingInteraction({
      type: "knock",
      requestId: event.payload.requestId,
      fromUserId: event.payload.fromUserId,
      spaceId: event.payload.spaceId,
      receivedAt: new Date().toISOString()
    });
    return;
  }
  if (event.type === "coworking.knock.resolved") {
    emitCoworkingInteraction({
      type: "knock-resolved",
      requestId: event.payload.requestId,
      status: event.payload.status,
      spaceId: event.payload.spaceId,
      receivedAt: new Date().toISOString()
    });
  }
}

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByClient = false;
  private generation = 0;
  private opening = false;
  private activeTicket: string | null = null;

  constructor(private readonly options: RealtimeClientOptions) {}

  connect(): void {
    if (this.socket || this.opening || this.reconnectTimer) return;
    this.closedByClient = false;
    this.generation += 1;
    void this.openSocket(this.generation);
  }

  disconnect(): void {
    this.closedByClient = true;
    this.generation += 1;
    this.opening = false;
    this.activeTicket = null;
    this.clearReconnectTimer();
    this.clearConnectionTimer();
    const socket = this.socket;
    this.socket = null;
    if (socket?.readyState === WebSocket.OPEN) {
      try {
        socket.send("41");
      } catch {
        // La fermeture locale reste prioritaire.
      }
    }
    socket?.close();
    this.options.onConnectionChange?.(false);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private clearConnectionTimer(): void {
    if (!this.connectionTimer) return;
    clearTimeout(this.connectionTimer);
    this.connectionTimer = null;
  }

  private finalizeSocket(socket: WebSocket, generation: number): void {
    if (socket !== this.socket) return;
    this.clearConnectionTimer();
    this.socket = null;
    this.activeTicket = null;
    this.options.onConnectionChange?.(false);
    if (!this.closedByClient && generation === this.generation) {
      this.scheduleReconnect();
    }
  }

  private dispatchPayload(payload: unknown): void {
    const normalized = normalizeRealtimeEvent(payload);
    if (!normalized) return;
    broadcastCoworkingInteraction(normalized);
    this.options.onEvent(normalized);
  }

  private handleFrame(socket: WebSocket, rawData: unknown): void {
    const text = String(rawData);

    // Engine.IO ouvre la connexion avec `0{...}`. On rejoint ensuite le namespace
    // Socket.IO principal avec le ticket éphémère, sans exposer le JWT utilisateur.
    if (text.startsWith("0")) {
      const auth = this.activeTicket ? { ticket: this.activeTicket } : {};
      socket.send(`40${JSON.stringify(auth)}`);
      return;
    }

    // Heartbeat Engine.IO.
    if (text === "2") {
      socket.send("3");
      return;
    }

    // Connexion Socket.IO confirmée.
    if (text.startsWith("40")) {
      this.clearConnectionTimer();
      this.reconnectAttempt = 0;
      this.options.onConnectionChange?.(true);
      return;
    }

    // Evènement Socket.IO : 42["message.created", {...}]
    if (text.startsWith("42")) {
      try {
        const decoded = JSON.parse(text.slice(2)) as unknown;
        if (!Array.isArray(decoded) || typeof decoded[0] !== "string") return;
        this.dispatchPayload(asSocketEventPayload(decoded[0], decoded[1]));
      } catch {
        // Trame invalide ignorée sans interrompre le canal.
      }
      return;
    }

    // Compatibilité avec un éventuel endpoint WSS JSON direct déjà déployé.
    try {
      this.dispatchPayload(JSON.parse(text) as unknown);
    } catch {
      // Les trames Engine.IO non pertinentes et les données invalides sont ignorées.
    }
  }

  private async openSocket(generation: number): Promise<void> {
    if (this.opening || this.closedByClient || generation !== this.generation) return;
    this.opening = true;
    try {
      const ticket = await this.options.ticketProvider();
      if (this.closedByClient || generation !== this.generation) return;
      this.activeTicket = ticket;
      // Le ticket éphémère ne doit jamais apparaître dans l'URL : les reverse
      // proxies, CDN et outils d'observabilité journalisent fréquemment les
      // query strings. Il est transmis uniquement dans la trame d'auth Socket.IO.
      const socket = new WebSocket(buildSocketIoWebSocketUrl(this.options.url));
      this.socket = socket;
      this.connectionTimer = setTimeout(() => {
        if (socket !== this.socket) return;
        try {
          socket.close();
        } finally {
          this.finalizeSocket(socket, generation);
        }
      }, this.options.connectionTimeoutMs ?? 12_000);

      socket.onopen = () => {
        if (socket !== this.socket || generation !== this.generation) return;
        // Le canal est physiquement ouvert. La disponibilité applicative est
        // confirmée par la trame Socket.IO `40`.
      };

      socket.onmessage = (event) => {
        if (socket !== this.socket || generation !== this.generation) return;
        this.handleFrame(socket, event.data);
      };

      socket.onerror = () => {
        if (socket !== this.socket || generation !== this.generation) return;
        this.options.onConnectionChange?.(false);
        try {
          socket.close();
        } catch {
          this.finalizeSocket(socket, generation);
          return;
        }
        setTimeout(() => this.finalizeSocket(socket, generation), 250);
      };

      socket.onclose = () => {
        this.finalizeSocket(socket, generation);
      };
    } catch {
      this.options.onConnectionChange?.(false);
      if (!this.closedByClient && generation === this.generation) {
        this.scheduleReconnect();
      }
    } finally {
      if (generation === this.generation) this.opening = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.closedByClient) return;
    const random = this.options.random ?? Math.random;
    const randomValue = Math.min(1, Math.max(0, random()));
    const base = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt);
    const delay = base + Math.floor(base * 0.2 * randomValue);
    this.reconnectAttempt += 1;
    const generation = this.generation;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.openSocket(generation);
    }, delay);
  }
}
