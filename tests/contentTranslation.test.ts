import { deepStrictEqual, strictEqual } from "node:assert";
import { test } from "node:test";

import {
  hasTranslatedPoll,
  translatedContentField,
  translatedPollOption,
  translatedPollQuestion
} from "../src/i18n/contentTranslation";
import { setTranslationRequestLanguage } from "../src/i18n/translationLocale";
import {
  normalizeContentTranslation,
  normalizePollTranslation
} from "../src/services/api/translationWire";

test("traduit un champ de contenu sans écraser l'original", () => {
  setTranslationRequestLanguage("en");
  const original = "Je cherche un photographe à Carcassonne.";
  const translation = normalizeContentTranslation(
    {
      source_language: "fr",
      target_language: "en",
      status: "ready",
      fields: { body: "I am looking for a photographer in Carcassonne." }
    },
    "en"
  );
  strictEqual(
    translatedContentField(original, translation, "body"),
    "I am looking for a photographer in Carcassonne."
  );
  strictEqual(original, "Je cherche un photographe à Carcassonne.");
});

test("revient à l'original si la traduction est pending ou vise une autre langue", () => {
  setTranslationRequestLanguage("en");
  const original = "Bonjour";
  strictEqual(
    translatedContentField(original, {
      targetLanguage: "en",
      sourceLanguage: "fr",
      status: "pending",
      fields: { body: "Hello" }
    }, "body"),
    original
  );
  strictEqual(
    translatedContentField(original, {
      targetLanguage: "de",
      sourceLanguage: "fr",
      status: "ready",
      fields: { body: "Hallo" }
    }, "body"),
    original
  );
});

test("traduit la question et chaque option d'un sondage par identifiant stable", () => {
  setTranslationRequestLanguage("en");
  const translation = normalizePollTranslation(
    {
      source_language: "fr",
      target_language: "en",
      status: "ready",
      question: "Which time slot do you prefer?",
      options: {
        "option-a": "Thursday at 6:30 p.m.",
        "option-b": "Friday at 7 p.m."
      }
    },
    "en"
  );
  strictEqual(
    translatedPollQuestion("Quel créneau préférez-vous ?", translation),
    "Which time slot do you prefer?"
  );
  strictEqual(
    translatedPollOption("option-a", 0, "Jeudi à 18 h 30", translation),
    "Thursday at 6:30 p.m."
  );
  strictEqual(
    translatedPollOption("option-b", 1, "Vendredi à 19 h", translation),
    "Friday at 7 p.m."
  );
  strictEqual(
    hasTranslatedPoll(
      "Quel créneau préférez-vous ?",
      [
        { id: "option-a", label: "Jeudi à 18 h 30" },
        { id: "option-b", label: "Vendredi à 19 h" }
      ],
      translation
    ),
    true
  );
});

test("normalise un contrat multi-champs sans toucher aux données non traduisibles", () => {
  const translation = normalizeContentTranslation(
    {
      target_language: "es",
      source_language: "fr",
      status: "ready",
      title: "2 eventos esperan tu voto",
      description: "Contenido de la comunidad",
      last_message: "Necesito un fotógrafo en Toulouse."
    },
    "es"
  );
  deepStrictEqual(translation.fields, {
    title: "2 eventos esperan tu voto",
    description: "Contenido de la comunidad",
    lastMessage: "Necesito un fotógrafo en Toulouse."
  });
  strictEqual(translation.targetLanguage, "es");
  strictEqual(translation.sourceLanguage, "fr");
});

test("accepte les options de sondage renvoyées sous forme de tableau", () => {
  const translation = normalizePollTranslation(
    {
      target_language: "de",
      source_language: "fr",
      status: "ready",
      question: "Welchen Termin bevorzugst du?",
      options: [
        { id: "a", label: "Donnerstag" },
        { id: "b", translated_label: "Freitag" }
      ]
    },
    "de"
  );
  deepStrictEqual(translation.options, { a: "Donnerstag", b: "Freitag" });
});
