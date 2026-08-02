"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrivateConversation = isPrivateConversation;
exports.isGroupConversation = isGroupConversation;
function isPrivateConversation(conversation) {
    return (conversation.type === "direct" || conversation.type === "small_group");
}
function isGroupConversation(conversation) {
    return !isPrivateConversation(conversation);
}
