import type {
  StandaloneStateKey,
  StandaloneStateStore
} from "./standaloneStore.types";

const memory = new Map<StandaloneStateKey, string>();

export function createStandaloneStateStore(): StandaloneStateStore {
  return {
    async load<T>(key: StandaloneStateKey): Promise<T | null> {
      const raw = memory.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async save<T>(key: StandaloneStateKey, value: T): Promise<void> {
      memory.set(key, JSON.stringify(value));
    },
    async remove(key: StandaloneStateKey): Promise<void> {
      memory.delete(key);
    },
    async purge(): Promise<void> {
      memory.clear();
    }
  };
}

export async function purgeStandaloneData(): Promise<void> {
  memory.clear();
}
