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
}

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.options.onConnectionChange?.(false);
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

      socket.onopen = () => {
        if (socket !== this.socket) return;
        this.reconnectAttempt = 0;
        this.options.onConnectionChange?.(true);
      };

      socket.onmessage = (event) => {
        try {
          const parsed: unknown = JSON.parse(String(event.data));
          const normalized = normalizeRealtimeEvent(parsed);
          if (normalized) this.options.onEvent(normalized);
        } catch {
          // Un événement invalide est ignoré sans interrompre la connexion.
        }
      };

      socket.onerror = () => {
        if (socket !== this.socket) return;
        this.options.onConnectionChange?.(false);
        // Certains environnements ne déclenchent pas toujours onclose après onerror.
        try {
          socket.close();
        } catch {
          this.socket = null;
          if (!this.closedByClient) this.scheduleReconnect();
        }
      };

      socket.onclose = () => {
        if (socket !== this.socket) return;
        this.options.onConnectionChange?.(false);
        this.socket = null;
        if (!this.closedByClient) this.scheduleReconnect();
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
