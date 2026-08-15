import assert from "node:assert/strict";
import test from "node:test";

import { getCurrentUiLocaleTag, setCurrentUiLocale, uiLocaleTagFor } from "../src/i18n/uiLocale";

test("chaque langue UI possède une locale de date et heure dédiée", () => {
  assert.equal(uiLocaleTagFor("fr"), "fr-FR");
  assert.equal(uiLocaleTagFor("en"), "en-GB");
  assert.equal(uiLocaleTagFor("es"), "es-ES");
  assert.equal(uiLocaleTagFor("de"), "de-DE");
  assert.equal(uiLocaleTagFor("it"), "it-IT");
  assert.equal(uiLocaleTagFor("pt"), "pt-PT");
});

test("la locale courante suit immédiatement la langue Connexio", () => {
  setCurrentUiLocale("de");
  assert.equal(getCurrentUiLocaleTag(), "de-DE");
  setCurrentUiLocale("fr");
  assert.equal(getCurrentUiLocaleTag(), "fr-FR");
});
