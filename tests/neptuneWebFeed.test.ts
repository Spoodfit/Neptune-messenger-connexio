import assert from "node:assert/strict";
import test from "node:test";

import {
  needPayloadFromHighlight,
  normalizeNeptuneWebFeed
} from "../src/services/api/neptuneWebFeed";
import type { AppUser } from "../src/types/messaging";

const member: AppUser = {
  id: "member-1",
  name: "Johan Zambelli",
  initials: "JZ",
  company: "Neptune Business",
  city: "Carcassonne",
  role: "visionnaire",
  roleLabel: "Visionnaire",
  online: true
};

test("fusionne les besoins et avantages réels dans le feed Connexio", () => {
  const feed = normalizeNeptuneWebFeed(
    [
      {
        id: "need-1",
        auteur_id: "member-1",
        titre: "Je recherche un vidéaste",
        description: "Pour une émission à Toulouse",
        statut: "actif",
        ville: "Toulouse",
        created_date: "2026-08-11T10:00:00.000Z"
      }
    ],
    [
      {
        id: "benefit-1",
        auteur_id: "member-1",
        titre: "-20 % sur le studio",
        description: "Réservé aux membres",
        active: true,
        is_comite_entreprise: true,
        image: "https://cdn.example.com/benefit.jpg",
        created_date: "2026-08-11T11:00:00.000Z"
      }
    ],
    [member]
  );

  assert.equal(feed.length, 2);
  assert.equal(feed[0]?.id, "benefit-1");
  assert.equal(feed[0]?.kind, "offre");
  assert.equal(feed[0]?.syncedWithAdvantagesCommittee, true);
  assert.equal(feed[1]?.kind, "besoin");
  assert.equal(feed[1]?.author.id, "member-1");
});

test("crée un besoin avec l’identifiant du compte Neptune connecté", () => {
  const payload = needPayloadFromHighlight(
    "Je recherche un expert-comptable\nPour la facturation électronique",
    member,
    ["member-2", "member-2"]
  );

  assert.equal(payload.auteur_id, "member-1");
  assert.equal(payload.created_by_id, "member-1");
  assert.equal(payload.titre, "Je recherche un expert-comptable");
  assert.deepEqual(payload.mentions, ["member-2"]);
});
