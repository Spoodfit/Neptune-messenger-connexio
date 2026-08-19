import { useSyncExternalStore } from "react";
import type { HighlightComment, HighlightKind, HighlightPost } from "../types/experience";
import type { ChatMessage } from "../types/messaging";

interface TextEdit { body: string; updatedAt: string; }
interface HighlightEdit extends TextEdit { kind: HighlightKind; }

let revision = 0;
const listeners = new Set<() => void>();
const messageEdits = new Map<string, TextEdit>();
const commentEdits = new Map<string, TextEdit>();
const highlightEdits = new Map<string, HighlightEdit>();
const notify = () => { revision += 1; listeners.forEach((listener) => listener()); };

export function useContentEditRevision() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => revision, () => revision);
}

export function applyMessageEdit(message: ChatMessage): ChatMessage {
  const edit = messageEdits.get(message.id);
  return edit ? { ...message, body: edit.body, updatedAt: edit.updatedAt } : message;
}
export function applyCommentEdit(comment: HighlightComment): HighlightComment {
  const edit = commentEdits.get(comment.id);
  return edit ? { ...comment, body: edit.body, updatedAt: edit.updatedAt } : comment;
}
export function applyHighlightEdit(post: HighlightPost): HighlightPost {
  const edit = highlightEdits.get(post.id);
  return {
    ...post,
    ...(edit ? { body: edit.body, kind: edit.kind, updatedAt: edit.updatedAt } : {}),
    comments: post.comments.map(applyCommentEdit)
  };
}
export function rememberMessageEdit(messageId: string, body: string, updatedAt = new Date().toISOString()) {
  messageEdits.set(messageId, { body: body.trim(), updatedAt });
  notify();
}
export function rememberCommentEdit(commentId: string, body: string, updatedAt = new Date().toISOString()) {
  commentEdits.set(commentId, { body: body.trim(), updatedAt });
  notify();
}
export function rememberHighlightEdit(postId: string, body: string, kind: HighlightKind, updatedAt = new Date().toISOString()) {
  highlightEdits.set(postId, { body: body.trim(), kind, updatedAt });
  notify();
}
