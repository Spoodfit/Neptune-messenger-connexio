import {
  normalizeRealtimeEvent,
  type RealtimeEvent
} from "./realtimeEvents";

export type { RealtimeEvent } from "./realtimeEvents";

interface RealtimeClientOptions {
  url: string;
  ticketProvider: () => Promise<string>;
  onEvent: (event: RealtimeEvent) => void;
  onConnectionChange?: (connected: boolean) => void;
  random?: () => number;
  connectionTimeoutMs?: number;
}

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByClient = false;
  private generation = 0;
  private opening = false;

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
    this.clearReconnectTimer();
    this.clearConnectionTimer();
    const socket = this.socket;
    this.socket = null;
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
    this.options.onConnectionChange?.(false);
    if (!this.closedByClient && generation === this.generation) {
      this.scheduleReconnect();
    }
  }

  private async openSocket(generation: number): Promise<void> {
    if (this.opening || this.closedByClient || generation !== this.generation) return;
    this.opening = true;
    try {
      const ticket = await this.options.ticketProvider();
      if (this.closedByClient || generation !== this.generation) return;
      const separator = this.options.url.includes("?") ? "&" : "?";
      const url = `${this.options.url}${separator}ticket=${encodeURIComponent(ticket)}`;
      const socket = new WebSocket(url);
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
        this.clearConnectionTimer();
        this.reconnectAttempt = 0;
        this.options.onConnectionChange?.(true);
      };

      socket.onmessage = (event) => {
        if (socket !== this.socket || generation !== this.generation) return;
        try {
          const parsed: unknown = JSON.parse(String(event.data));
          const normalized = normalizeRealtimeEvent(parsed);
          if (normalized) this.options.onEvent(normalized);
        } catch {
          // Un événement invalide est ignoré sans interrompre la connexion.
        }
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
