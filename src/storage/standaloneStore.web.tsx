import type { StandaloneStateKey, StandaloneStateStore } from "./standaloneStore.types";

const PREFIX = "connexio.standalone.";
const memory = new Map<StandaloneStateKey, string>();

function getStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function fullKey(key: StandaloneStateKey): string {
  return `${PREFIX}${key}`;
}

export function createStandaloneStateStore(): StandaloneStateStore {
  return {
    async load<T>(key: StandaloneStateKey): Promise<T | null> {
      const raw = getStorage()?.getItem(fullKey(key)) ?? memory.get(key) ?? null;
      if (!raw) return null;
      try { return JSON.parse(raw) as T; } catch { return null; }
    },
    async save<T>(key: StandaloneStateKey, value: T): Promise<void> {
      const raw = JSON.stringify(value);
      const target = getStorage();
      if (target) target.setItem(fullKey(key), raw);
      else memory.set(key, raw);
    },
    async remove(key: StandaloneStateKey): Promise<void> {
      getStorage()?.removeItem(fullKey(key));
      memory.delete(key);
    },
    async purge(): Promise<void> {
      const target = getStorage();
      for (const key of ["messaging", "experience", "group-admin"] as StandaloneStateKey[]) {
        target?.removeItem(fullKey(key));
        memory.delete(key);
      }
    }
  };
}

export async function purgeStandaloneData(): Promise<void> {
  await createStandaloneStateStore().purge();
}
