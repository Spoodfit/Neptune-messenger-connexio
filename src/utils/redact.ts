const SENSITIVE_KEY = /(token|secret|password|authorization|cookie|body|message|content|code)/i;
const BEARER = /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi;

export function redactString(value: string): string {
  return value.replace(BEARER, "Bearer [REDACTED]");
}

export function redactForLogs(value: unknown): unknown {
  return redactInternal(value, new WeakSet<object>());
}

function redactInternal(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactInternal(item, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key)
      ? "[REDACTED]"
      : redactInternal(nested, seen);
  }
  return output;
}
