"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactString = redactString;
exports.redactForLogs = redactForLogs;
const SENSITIVE_KEY = /(token|secret|password|authorization|cookie|body|message|content|code)/i;
const BEARER = /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
function redactString(value) {
    return value.replace(BEARER, "Bearer [REDACTED]");
}
function redactForLogs(value) {
    return redactInternal(value, new WeakSet());
}
function redactInternal(value, seen) {
    if (typeof value === "string")
        return redactString(value);
    if (value === null || typeof value !== "object")
        return value;
    if (seen.has(value))
        return "[CIRCULAR]";
    seen.add(value);
    if (Array.isArray(value)) {
        return value.map((item) => redactInternal(item, seen));
    }
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
        output[key] = SENSITIVE_KEY.test(key)
            ? "[REDACTED]"
            : redactInternal(nested, seen);
    }
    return output;
}
