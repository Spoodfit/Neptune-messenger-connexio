"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_MESSAGE_IDENTITY_KEYS = void 0;
exports.getMessageIdentityKeys = getMessageIdentityKeys;
exports.hasKnownMessage = hasKnownMessage;
exports.rememberMessage = rememberMessage;
exports.rememberMessages = rememberMessages;
exports.MAX_MESSAGE_IDENTITY_KEYS = 20_000;
function getMessageIdentityKeys(message) {
    const keys = [`id:${message.id}`];
    if (message.clientMessageId)
        keys.push(`client:${message.clientMessageId}`);
    return keys;
}
function hasKnownMessage(knownKeys, message) {
    return getMessageIdentityKeys(message).some((key) => knownKeys.has(key));
}
function trimKnownKeys(knownKeys) {
    while (knownKeys.size > exports.MAX_MESSAGE_IDENTITY_KEYS) {
        const oldest = knownKeys.values().next().value;
        if (!oldest)
            return;
        knownKeys.delete(oldest);
    }
}
function rememberMessage(knownKeys, message) {
    for (const key of getMessageIdentityKeys(message)) {
        if (knownKeys.has(key))
            knownKeys.delete(key);
        knownKeys.add(key);
    }
    trimKnownKeys(knownKeys);
}
function rememberMessages(knownKeys, messages) {
    for (const message of messages)
        rememberMessage(knownKeys, message);
}
