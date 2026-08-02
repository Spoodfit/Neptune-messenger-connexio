"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMessageTime = formatMessageTime;
exports.formatConversationTime = formatConversationTime;
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
});
const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short"
});
function parseDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
}
function formatMessageTime(value) {
    const date = parseDate(value);
    return date ? timeFormatter.format(date) : "Heure inconnue";
}
function formatConversationTime(value) {
    if (!value)
        return "";
    const date = parseDate(value);
    if (!date)
        return "";
    const now = new Date();
    const sameDay = date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
    if (sameDay) {
        return timeFormatter.format(date);
    }
    return dayFormatter.format(date).replace(".", "");
}
