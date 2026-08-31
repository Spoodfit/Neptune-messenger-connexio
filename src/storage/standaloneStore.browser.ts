import type { StandaloneStateKey, StandaloneStateStore } from "./standaloneStore.types";

const prefix = "connexio.standalone.";
const memory = new Map<StandaloneStateKey, string>();
const ALL_KEYS: StandaloneStateKey[] = [
  "messaging",
  "experience",
  "group-admin",
  "scheduled-calls",
  "appearance"
];

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function keyFor(key: StandaloneStateKey): string {
  return `${prefix}${key}`;
}

export function createStandaloneStateStore(): StandaloneStateStore {
  return {
    async load<T>(key: StandaloneStateKey): Promise<T | null> {
      const raw = getStorage()?.getItem(keyFor(key)) ?? memory.get(key) ?? null;
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async save<T>(key: StandaloneStateKey, value: T): Promise<void> {
      const raw = JSON.stringify(value);
      const storage = getStorage();
      if (storage) storage.setItem(keyFor(key), raw);
      else memory.set(key, raw);
    },
    async remove(key: StandaloneStateKey): Promise<void> {
      getStorage()?.removeItem(keyFor(key));
      memory.delete(key);
    },
    async purge(): Promise<void> {
      for (const key of ALL_KEYS) {
        getStorage()?.removeItem(keyFor(key));
        memory.delete(key);
      }
    }
  };
}

export async function purgeStandaloneData(): Promise<void> {
  await createStandaloneStateStore().purge();
}
