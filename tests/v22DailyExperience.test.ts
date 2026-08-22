import assert from "node:assert/strict";
import test from "node:test";

import {
  groupSectionForConversation,
  isAnnouncementCollapsed,
  isAnnouncementConversation,
  sortConversationsByPriority
} from "../src/domain/conversationOrganization";
import { buildHighlightFeedBlocks, shouldHighlightBeWide } from "../src/domain/highlightFeedLayout";
import { inferHighlightKind, popularHighlightIds } from "../src/domain/highlightInference";
import type { HighlightPost } from "../src/types/experience";
import type { Conversation } from "../src/types/messaging";

function post(id: string, kind: HighlightPost["kind"], body: string, reactions = 0, comments = 0, shares = 0): HighlightPost {
  return {
    id,
    author: { id: "me", name: "Test", initials: "T", company: "Neptune", city: "Carcassonne", role: "moussaillon", roleLabel: "Moussaillon", online: true },
    kind,
    body,
    createdAt: `2026-08-19T10:${id.padStart(2, "0")}:00.000Z`,
    reactions: reactions ? [{ emoji: "🔥", count: reactions, reactedByCurrentUser: false }] : [],
    comments: Array.from({ length: comments }, (_, index) => ({
      id: `${id}-c${index}`,
      postId: id,
      author: { id: `u${index}`, name: `U${index}`, initials: "U", company: "N", city: "C", role: "moussaillon", roleLabel: "Moussaillon", online: false },
      body: "Commentaire",
      createdAt: "2026-08-19T10:00:00.000Z",
      reactions: []
    })),
    shareCount: shares
  } as HighlightPost;
}

function conversation(id: string, type: Conversation["type"], lastMessageAt: string, extra: Partial<Conversation> = {}): Conversation {
  return {
    id,
    type,
    name: id,
    memberCount: 5,
    unreadCount: 0,
    lastMessage: "Dernier message",
    lastMessageAt,
    canManage: false,
    ...extra
  } as Conversation;
}

test("V22 détecte automatiquement besoin, réussite et offre", () => {
  assert.equal(inferHighlightKind("Je recherche un expert comptable à Toulouse, quelqu’un à recommander ?"), "besoin");
  assert.equal(inferHighlightKind("Bonne nouvelle, objectif atteint : nous avons signé un nouveau client !"), "reussite");
  assert.equal(inferHighlightKind("Je propose deux places disponibles avec une réduction pour les membres"), "offre");
  assert.equal(inferHighlightKind("Déjeuner très sympa avec le club ce midi."), "standard");
});

test("V22 force les besoins et les publications les plus engagées en pleine largeur", () => {
  const besoin = post("01", "besoin", "Je cherche un contact");
  const normal = post("02", "standard", "Petit temps fort");
  const popular = post("03", "standard", "Publication populaire", 20, 8, 3);
  const popularIds = popularHighlightIds([besoin, normal, popular]);
  assert.equal(shouldHighlightBeWide(besoin, popularIds), true);
  assert.equal(shouldHighlightBeWide(popular, popularIds), true);
});

test("V22 répartit les demi-publications dans deux colonnes indépendantes", () => {
  const posts = [
    post("01", "standard", "Court"),
    post("02", "standard", "Une publication un peu plus longue avec davantage de contenu pour modifier sa hauteur."),
    post("03", "offre", "Offre du jour"),
    post("04", "standard", "Autre temps fort")
  ];
  const blocks = buildHighlightFeedBlocks(posts);
  const masonry = blocks.find((block) => block.kind === "masonry");
  assert.ok(masonry && masonry.kind === "masonry");
  assert.ok(masonry.left.length > 0);
  assert.ok(masonry.right.length > 0);
  assert.equal(masonry.left.length + masonry.right.length, 4);
});

test("V22 classe les groupes Clubs, Gestion et Généraux", () => {
  assert.equal(groupSectionForConversation(conversation("Toulouse", "city", "2026-08-19T10:00:00Z")), "clubs");
  assert.equal(groupSectionForConversation(conversation("Visionnaires", "role", "2026-08-19T10:00:00Z")), "management");
  assert.equal(groupSectionForConversation(conversation("Publicité", "topic", "2026-08-19T10:00:00Z")), "general");
});

test("Annonce reste identifiable et se compacte seulement lorsqu’elle est ancienne et sans alerte", () => {
  const now = Date.parse("2026-08-19T10:00:00Z");
  const oldAnnouncement = conversation("Annonce", "announcement", "2026-08-01T10:00:00Z");
  assert.equal(isAnnouncementConversation(oldAnnouncement), true);
  assert.equal(isAnnouncementCollapsed(oldAnnouncement, now), true);
  assert.equal(isAnnouncementCollapsed({ ...oldAnnouncement, unreadCount: 1 }, now), false);
});

test("les conversations épinglées passent avant les plus récentes", () => {
  const older = conversation("older", "city", "2026-08-10T10:00:00Z");
  const newer = conversation("newer", "city", "2026-08-19T10:00:00Z");
  const sorted = sortConversationsByPriority([newer, older], (id) => id === "older");
  assert.deepEqual(sorted.map((item) => item.id), ["older", "newer"]);
});
