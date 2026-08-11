import { deepStrictEqual, strictEqual } from "node:assert";
import { test } from "node:test";

import {
  capabilitiesForBackendContract,
  isPublicStoreBackendReady,
  normalizeBackendContract
} from "../src/config/backendCapabilities";

test("le backend Neptune web expose seulement les capacités prouvées", () => {
  const capabilities = capabilitiesForBackendContract("neptune-web-v1");

  strictEqual(capabilities.sharedAccount, true);
  strictEqual(capabilities.memberDirectory, true);
  strictEqual(capabilities.needsRead, true);
  strictEqual(capabilities.benefitsRead, true);
  strictEqual(capabilities.messaging, false);
  strictEqual(capabilities.realtime, false);
  strictEqual(capabilities.pushNotifications, false);
  strictEqual(isPublicStoreBackendReady("neptune-web-v1"), false);
});

test("seul le contrat Connexio complet ouvre la gate Store", () => {
  strictEqual(isPublicStoreBackendReady("connexio-v1"), true);
  strictEqual(normalizeBackendContract("connexio-v1"), "connexio-v1");
  strictEqual(normalizeBackendContract("inconnu"), "neptune-web-v1");
  deepStrictEqual(
    capabilitiesForBackendContract("connexio-v1").messaging,
    true
  );
});
