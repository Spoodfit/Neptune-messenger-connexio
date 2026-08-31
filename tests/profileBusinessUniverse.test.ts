import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAppUser } from "../src/services/api/wireExtensions";

interface BusinessUniverseProjection {
  headline?: string;
  bio?: string;
  sector?: string;
  website?: string;
  canHelpWith?: string[];
  lookingFor?: string[];
  businessItems?: Array<{ title?: string; kind?: string }>;
}

test("préserve les données métier Neptune utiles au profil Connexio", () => {
  const member = normalizeAppUser({
    id: "member-1",
    name: "Léa Martin",
    entreprise: "Studio Neptune",
    ville: "Toulouse",
    role: "moussaillon",
    headline: "Direction artistique & stratégie de marque",
    bio: "J'aide les entreprises à clarifier leur image.",
    secteur: "Communication",
    website: "https://example.com",
    competences: ["Branding", "Direction artistique"],
    looking_for: ["Partenaires vidéo", "PME en croissance"],
    services: [
      { id: "service-1", name: "Audit de marque", description: "Positionnement et identité." }
    ],
    produits: ["Kit identité visuelle"]
  }) as ReturnType<typeof normalizeAppUser> & BusinessUniverseProjection;

  assert.equal(member.headline, "Direction artistique & stratégie de marque");
  assert.equal(member.bio, "J'aide les entreprises à clarifier leur image.");
  assert.equal(member.sector, "Communication");
  assert.equal(member.website, "https://example.com");
  assert.deepEqual(member.canHelpWith, ["Branding", "Direction artistique"]);
  assert.deepEqual(member.lookingFor, ["Partenaires vidéo", "PME en croissance"]);
  assert.deepEqual(member.businessItems?.map((item) => [item.kind, item.title]), [
    ["service", "Audit de marque"],
    ["product", "Kit identité visuelle"]
  ]);
});
