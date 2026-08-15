import assert from "node:assert/strict";
import test from "node:test";

import { normalizeUiLanguageCode, translateUiText } from "../src/i18n/uiTranslations";

test("application UI language changes visible navigation copy", () => {
  assert.equal(translateUiText("Temps forts", "en"), "Highlights");
  assert.equal(translateUiText("Groupes", "es"), "Grupos");
  assert.equal(translateUiText("Écrire un message…", "de"), "Nachricht schreiben…");
  assert.equal(translateUiText("Apparence", "it"), "Aspetto");
  assert.equal(translateUiText("Appels", "pt"), "Chamadas");
});

test("unknown UI text and user content are never rewritten", () => {
  assert.equal(translateUiText("Rendez-vous client Alpha 14h", "en"), "Rendez-vous client Alpha 14h");
});

test("unsupported legacy UI locale falls back to English catalog", () => {
  assert.equal(normalizeUiLanguageCode("ja"), "en");
  assert.equal(translateUiText("Groupes", "ja"), "Groups");
});
