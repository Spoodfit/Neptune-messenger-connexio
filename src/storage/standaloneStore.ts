import Storage from "expo-sqlite/kv-store";

import type {
  StandaloneStateKey,
  StandaloneStateStore
} from "./standaloneStore.types";

const PREFIX = "connexio.standalone.";
const ALL_KEYS: StandaloneStateKey[] = [
  "messaging",
  "experience",
  "group-admin",
  "scheduled-calls",
  "appearance"
];

function fullKey(key: StandaloneStateKey): string {
  return `${PREFIX}${key}`;
}

export function createStandaloneStateStore(): StandaloneStateStore {
  return {
    async load<T>(key: StandaloneStateKey): Promise<T | null> {
      const raw = await Storage.getItem(fullKey(key));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async save<T>(key: StandaloneStateKey, value: T): Promise<void> {
      await Storage.setItem(fullKey(key), JSON.stringify(value));
    },
    async remove(key: StandaloneStateKey): Promise<void> {
      await Storage.removeItem(fullKey(key));
    },
    async purge(): Promise<void> {
      for (const key of ALL_KEYS) {
        await Storage.removeItem(fullKey(key));
      }
    }
  };
}

export async function purgeStandaloneData(): Promise<void> {
  await createStandaloneStateStore().purge();
}
