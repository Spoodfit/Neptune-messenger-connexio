export type StandaloneStateKey =
  | "messaging"
  | "experience"
  | "group-admin"
  | "scheduled-calls"
  | "appearance"
  | "app-language";

export interface StandaloneStateStore {
  load<T>(key: StandaloneStateKey): Promise<T | null>;
  save<T>(key: StandaloneStateKey, value: T): Promise<void>;
  remove(key: StandaloneStateKey): Promise<void>;
  purge(): Promise<void>;
}
