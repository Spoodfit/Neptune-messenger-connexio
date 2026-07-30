import { env } from "../../config/env";

export class ApiError extends Error {
  readonly retryable: boolean;

  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.retryable =
      status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  timeoutMs?: number;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function parsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiError("Réponse JSON invalide.", response.status);
    }
  }
  return text;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!env.apiBaseUrl) {
    throw new ApiError("EXPO_PUBLIC_API_BASE_URL manquante.", 0);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  const externalSignal = options.signal;
  const abortFromExternal = () => controller.abort();
  externalSignal?.addEventListener("abort", abortFromExternal, { once: true });

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  try {
    const response = await fetch(joinUrl(env.apiBaseUrl, path), {
      ...options,
      headers,
      signal: controller.signal
    });
    const payload = await parsePayload(response);
    const requestId = response.headers.get("x-request-id") ?? undefined;

    if (!response.ok) {
      throw new ApiError(
        `Erreur API ${response.status}`,
        response.status,
        payload,
        requestId
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError("Requête interrompue ou expirée.", 408);
    }
    throw new ApiError("Backend Neptune indisponible.", 0, error);
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}
