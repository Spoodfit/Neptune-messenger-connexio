"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOptimisticMessage = createOptimisticMessage;
exports.reconcileServerMessage = reconcileServerMessage;
exports.markMessageSending = markMessageSending;
exports.markMessageFailed = markMessageFailed;
exports.queueMessageForRetry = queueMessageForRetry;
function createOptimisticMessage(input) {
    return {
        id: `local-${input.clientMessageId}`,
        clientMessageId: input.clientMessageId,
        conversationId: input.conversationId,
        senderId: input.senderId,
        senderName: input.senderName,
        senderInitials: input.senderInitials,
        senderAvatarUrl: input.senderAvatarUrl,
        body: input.body,
        createdAt: input.createdAt,
        status: "queued",
        isMine: true,
        replyToMessageId: input.replyToMessageId,
        attachments: input.attachments,
        mentionedUserIds: input.mentionedUserIds,
        retryCount: 0
    };
}
function reconcileServerMessage(local, server) {
    return {
        ...local,
        ...server,
        clientMessageId: server.clientMessageId ?? local.clientMessageId,
        isMine: local.isMine,
        status: server.status === "queued" || server.status === "sending"
            ? "sent"
            : server.status,
        errorCode: undefined
    };
}
function markMessageSending(message) {
    return {
        ...message,
        status: "sending",
        errorCode: undefined
    };
}
function markMessageFailed(message, errorCode) {
    return {
        ...message,
        status: "failed",
        errorCode,
        retryCount: (message.retryCount ?? 0) + 1
    };
}
function queueMessageForRetry(message) {
    return {
        ...message,
        status: "queued",
        errorCode: undefined
    };
}
