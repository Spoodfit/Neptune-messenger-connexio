import assert from "node:assert/strict";
import test from "node:test";

import { inferHighlightKind, popularHighlightIds } from "../src/domain/highlightInference";
import type { HighlightPost } from "../src/types/experience";

const basePost = (id: string, reactions = 0, comments = 0, shares = 0): HighlightPost => ({
  id,
  author: { id: "u", name: "Test", initials: "T", company: "Neptune", city: "Toulouse", role: "triton", roleLabel: "Triton", online: true },
  kind: "standard",
  body: "Publication",
  createdAt: new Date().toISOString(),
  reactions: reactions ? [{ emoji: "❤️", count: reactions, reactedByCurrentUser: false }] : [],
  comments: Array.from({ length: comments }, (_, index) => ({ id: `c${index}`, postId: id, author: { id: "u", name: "Test", initials: "T", company: "Neptune", city: "Toulouse", role: "triton", roleLabel: "Triton", online: true }, body: "Commentaire", createdAt: new Date().toISOString(), reactions: [] })),
  shareCount: shares
});

test("détecte un besoin sans demander à l’utilisateur de choisir un format", () => {
  assert.equal(inferHighlightKind("Je recherche un expert comptable à Toulouse"), "besoin");
  assert.equal(inferHighlightKind("Qui connaît quelqu'un dans le e-commerce ?"), "besoin");
});

test("détecte automatiquement réussite et offre", () => {
  assert.equal(inferHighlightKind("Bonne nouvelle : objectif atteint, nous avons signé notre nouveau client"), "reussite");
  assert.equal(inferHighlightKind("Je peux aider sur vos audits de marque, prestation disponible ce mois-ci"), "offre");
});

test("un texte neutre reste un Temps fort standard", () => {
  assert.equal(inferHighlightKind("Retour sur notre rencontre de ce matin avec le réseau"), "standard");
});

test("les publications les plus engageantes sont identifiées pour la pleine largeur", () => {
  const ids = popularHighlightIds([basePost("a", 1), basePost("b", 8, 3, 2), basePost("c", 2), basePost("d", 0)]);
  assert(ids.has("b"));
  assert(!ids.has("d"));
});
