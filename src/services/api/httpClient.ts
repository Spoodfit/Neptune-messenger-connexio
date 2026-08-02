import { env } from "../../config/env";
import {
  classifyAbort,
  isJsonMediaType,
  parseRetryAfterMs
} from "../../domain/httpProtocol";

export class ApiError extends Error {
  readonly retryable: boolean;

  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
    public readonly requestId?: string,
    public readonly code?: string,
    public readonly retryAfterMs?: number
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

interface ErrorPayload {
  message?: unknown;
  code?: unknown;
  error?: unknown;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function parsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (isJsonMediaType(contentType)) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(
        "Réponse JSON invalide.",
        response.ok ? 502 : response.status,
        undefined,
        response.headers.get("x-request-id") ?? undefined,
        "invalid-json"
      );
    }
  }
  return text;
}

function getErrorDetails(
  payload: unknown,
  status: number
): { message: string; code?: string } {
  if (typeof payload === "string" && payload.trim()) {
    return { message: payload.trim() };
  }
  if (payload && typeof payload === "object") {
    const candidate = payload as ErrorPayload;
    const code = typeof candidate.code === "string" ? candidate.code : undefined;
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return { message: candidate.message.trim(), code };
    }
    if (typeof candidate.error === "string" && candidate.error.trim()) {
      return { message: candidate.error.trim(), code };
    }
    if (candidate.error && typeof candidate.error === "object") {
      const nested = candidate.error as ErrorPayload;
      if (typeof nested.message === "string" && nested.message.trim()) {
        return {
          message: nested.message.trim(),
          code: typeof nested.code === "string" ? nested.code : code
        };
      }
    }
    return { message: `Erreur API ${status}`, code };
  }
  return { message: `Erreur API ${status}` };
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!env.apiBaseUrl) {
    throw new ApiError("EXPO_PUBLIC_API_BASE_URL manquante.", 0);
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 15_000);
  const externalSignal = options.signal;
  const abortFromExternal = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener("abort", abortFromExternal, { once: true });

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Accept-Language", "fr-FR");
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
      const details = getErrorDetails(payload, response.status);
      throw new ApiError(
        details.message,
        response.status,
        payload,
        requestId,
        details.code,
        parseRetryAfterMs(response.headers.get("retry-after"))
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      const classification = classifyAbort(
        timedOut,
        Boolean(externalSignal?.aborted)
      );
      throw new ApiError(
        classification.message,
        classification.status,
        undefined,
        undefined,
        classification.code
      );
    }
    throw new ApiError("Backend Neptune indisponible.", 0, error, undefined, "network");
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}
