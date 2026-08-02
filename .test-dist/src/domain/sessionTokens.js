"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCESS_TOKEN_REFRESH_SKEW_MS = void 0;
exports.calculateAccessTokenExpiry = calculateAccessTokenExpiry;
exports.shouldRefreshAccessToken = shouldRefreshAccessToken;
exports.ACCESS_TOKEN_REFRESH_SKEW_MS = 60_000;
function calculateAccessTokenExpiry(expiresInSeconds, now = Date.now()) {
    if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0)
        return now;
    return now + Math.floor(expiresInSeconds * 1_000);
}
function shouldRefreshAccessToken(accessToken, expiresAt, now = Date.now(), skewMs = exports.ACCESS_TOKEN_REFRESH_SKEW_MS) {
    if (!accessToken || !expiresAt)
        return true;
    return expiresAt - Math.max(0, skewMs) <= now;
}
