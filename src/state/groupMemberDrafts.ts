import { useSyncExternalStore } from "react";

let revision = 0;
const listeners = new Set<() => void>();
const addedByGroup = new Map<string, Set<string>>();
const notify = () => { revision += 1; listeners.forEach((listener) => listener()); };

export function useGroupMemberDraftRevision() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => revision, () => revision);
}
export function getAddedGroupMemberIds(groupId: string): string[] { return [...(addedByGroup.get(groupId) ?? new Set<string>())]; }
export function addGroupMemberDraft(groupId: string, memberId: string) { const next = new Set(addedByGroup.get(groupId) ?? []); next.add(memberId); addedByGroup.set(groupId, next); notify(); }
export function removeGroupMemberDraft(groupId: string, memberId: string) { const next = new Set(addedByGroup.get(groupId) ?? []); if (!next.delete(memberId)) return; addedByGroup.set(groupId, next); notify(); }
