import { strictEqual } from "node:assert";
import { test } from "node:test";

import {
  getLanguageFrenchName,
  normalizeLanguageCode
} from "../src/i18n/languages";
import {
  getTranslationRequestLanguage,
  setTranslationRequestLanguage,
  withTranslationLanguageHeader
} from "../src/i18n/translationLocale";
import { normalizeMessageTranslation } from "../src/services/api/translationWire";
import { capabilitiesForBackendContract } from "../src/config/backendCapabilities";
import { translationSourceAttribution } from "../src/i18n/contentTranslation";

test("normalise les locales système vers une langue supportée", () => {
  strictEqual(normalizeLanguageCode("fr-FR"), "fr");
  strictEqual(normalizeLanguageCode("EN_us"), "en");
  strictEqual(normalizeLanguageCode("xx-YY", "fr"), "fr");
  strictEqual(getLanguageFrenchName("en-US"), "Anglais");
});

test("propage la langue cible sans écraser un header explicite", () => {
  setTranslationRequestLanguage("es-MX");
  strictEqual(getTranslationRequestLanguage(), "es");

  const automatic = withTranslationLanguageHeader({ "X-Connexio-Test": "1" });
  strictEqual(automatic.get("Accept-Language"), "es");
  strictEqual(automatic.get("X-Connexio-Test"), "1");

  const explicit = withTranslationLanguageHeader({ "Accept-Language": "de" });
  strictEqual(explicit.get("Accept-Language"), "de");
  setTranslationRequestLanguage("fr");
});

test("normalise une traduction backend", () => {
  const translation = normalizeMessageTranslation(
    {
      source_language: "en",
      target_language: "fr",
      body: "Bonjour, heureux de vous rencontrer.",
      status: "ready",
      generated_at: "2026-08-13T12:00:00.000Z"
    },
    "fr"
  );

  strictEqual(translation.sourceLanguage, "en");
  strictEqual(translation.targetLanguage, "fr");
  strictEqual(translation.body, "Bonjour, heureux de vous rencontrer.");
  strictEqual(translation.status, "ready");
});

test("la traduction appartient au contrat Connexio uniquement", () => {
  strictEqual(
    capabilitiesForBackendContract("connexio-v1").messageTranslation,
    true
  );
  strictEqual(
    capabilitiesForBackendContract("neptune-web-v1").messageTranslation,
    false
  );
});

test("l’attribution de traduction reste grammaticale dans la langue de l’interface", () => {
  const translation = {
    sourceLanguage: "en",
    targetLanguage: "fr",
    status: "ready" as const
  };
  strictEqual(translationSourceAttribution(translation, "fr"), "Traduit de l’anglais");
  strictEqual(translationSourceAttribution(translation, "en"), "Translated from English");
});
