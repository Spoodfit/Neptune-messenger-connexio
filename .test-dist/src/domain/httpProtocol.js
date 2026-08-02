"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJsonMediaType = isJsonMediaType;
exports.parseRetryAfterMs = parseRetryAfterMs;
exports.classifyAbort = classifyAbort;
function isJsonMediaType(contentType) {
    const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    return mediaType === "application/json" || mediaType.endsWith("+json");
}
function parseRetryAfterMs(value, now = Date.now()) {
    if (!value)
        return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.round(seconds * 1_000);
    }
    const date = Date.parse(value);
    if (!Number.isFinite(date))
        return undefined;
    return Math.max(0, date - now);
}
function classifyAbort(timedOut, externalSignalAborted) {
    if (!timedOut && externalSignalAborted) {
        return {
            message: "Requête annulée.",
            status: 499,
            code: "client-aborted"
        };
    }
    return {
        message: "Requête expirée.",
        status: 408,
        code: "timeout"
    };
}
