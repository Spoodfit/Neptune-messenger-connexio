"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSessionRuntime = configureSessionRuntime;
exports.resolveSessionAccessToken = resolveSessionAccessToken;
exports.refreshSessionAccessToken = refreshSessionAccessToken;
exports.resetSessionRuntimeForTests = resetSessionRuntimeForTests;
let activeHandlers = null;
function configureSessionRuntime(handlers) {
    activeHandlers = handlers;
    return () => {
        if (activeHandlers === handlers)
            activeHandlers = null;
    };
}
async function resolveSessionAccessToken(fallbackToken) {
    if (!activeHandlers)
        return fallbackToken ?? null;
    return (await activeHandlers.getAccessToken()) ?? fallbackToken ?? null;
}
async function refreshSessionAccessToken() {
    if (!activeHandlers)
        return null;
    return activeHandlers.refreshAccessToken();
}
function resetSessionRuntimeForTests() {
    activeHandlers = null;
}
