import assert from "node:assert/strict";
import test from "node:test";

import { translateConnexioUiText } from "../src/i18n/uiTranslator";

test("V17 traduit le chrome des écrans majeurs dans toutes les langues UI", () => {
  assert.equal(translateConnexioUiText("Espaces", "en"), "Spaces");
  assert.equal(translateConnexioUiText("Rendez-vous à venir", "es"), "Próximas citas");
  assert.equal(translateConnexioUiText("Compte et sécurité", "de"), "Konto und Sicherheit");
  assert.equal(translateConnexioUiText("Inviter un contact", "it"), "Invita un contatto");
  assert.equal(translateConnexioUiText("Politique de confidentialité", "pt"), "Política de privacidade");
});

test("V17 traduit les libellés dynamiques sans altérer les noms", () => {
  assert.equal(translateConnexioUiText("Appeler Léa Dupont", "en"), "Call Léa Dupont");
  assert.equal(translateConnexioUiText("Programmer avec Johan Zambelli", "de"), "Planen mit Johan Zambelli");
  assert.equal(translateConnexioUiText("Recommander un contact à Aurore Martin", "es"), "Recomendar un contacto a Aurore Martin");
  assert.equal(translateConnexioUiText("7 appels", "it"), "7 chiamate");
  assert.equal(translateConnexioUiText("Sélectionner Johan Zambelli", "en"), "Select Johan Zambelli");
  assert.equal(
    translateConnexioUiText("Carte du Coworking, 3 groupes ou personnes et 2 évènements", "de"),
    "Coworking-Karte, 3 Gruppen oder Personen und 2 Veranstaltungen"
  );
});

test("V17 ne traduit jamais une donnée utilisateur inconnue", () => {
  const message = "Bonjour Johan, voici mon offre sur mesure pour Neptune demain matin.";
  assert.equal(translateConnexioUiText(message, "en"), message);
  assert.equal(translateConnexioUiText("Société Dupont & Fils", "de"), "Société Dupont & Fils");
});
