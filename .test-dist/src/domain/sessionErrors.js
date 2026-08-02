"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldClearSessionAfterRefreshFailure = shouldClearSessionAfterRefreshFailure;
function shouldClearSessionAfterRefreshFailure(status) {
    return status === 400 || status === 401 || status === 403;
}
