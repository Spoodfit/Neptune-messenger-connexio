const { chromium } = require("playwright");

const BASE_URL = process.env.VISUAL_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const failures = [];

function pathOf(page) {
  return new URL(page.url()).pathname.replace(/\/$/, "") || "/";
}

function check(condition, label, detail = "") {
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

async function waitRoute(page, suffix, label) {
  try {
    await page.waitForURL((url) => url.pathname.replace(/\/$/, "").endsWith(suffix), { timeout: 6000 });
  } catch {}
  check(pathOf(page).endsWith(suffix), label, `route obtenue: ${pathOf(page)}`);
}

async function visibleLocator(locator) {
  const count = await locator.count().catch(() => 0);
  for (let index = count - 1; index >= 0; index -= 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function checkTarget(locator, label, minimum = 48) {
  const target = await visibleLocator(locator);
  if (!target) {
    failures.push(`${label} — cible absente`);
    return null;
  }
  const box = await target.boundingBox();
  if (!box) {
    failures.push(`${label} — géométrie indisponible`);
    return target;
  }
  check(box.width >= minimum && box.height >= minimum, label, `${Math.round(box.width)}x${Math.round(box.height)} px, minimum ${minimum}`);
  return target;
}

async function sentMessageSurface(page, body) {
  const candidate = page.locator(`[aria-label*="${body.replaceAll('"', '\\"')}"]`).first();
  await candidate.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  return (await candidate.isVisible().catch(() => false)) ? candidate : null;
}

async function auditMainNavigation(page) {
  await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
  for (const [tab, suffix] of [["Temps forts", "/highlights"], ["Appels", "/calls"], ["Profil", "/settings"], ["Messages", "/messages"]]) {
    await page.getByRole("tab", { name: new RegExp(tab) }).click();
    await waitRoute(page, suffix, `Navigation ${tab}`);
  }
}

async function auditMessages(page) {
  await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
  await checkTarget(page.getByRole("tab", { name: /Groupes/ }), "Messages : onglet Groupes tactile");
  await checkTarget(page.getByRole("tab", { name: /Privées/ }), "Messages : onglet Privées tactile");
  await checkTarget(page.getByLabel("Nouvelle conversation", { exact: true }), "Messages : nouvelle conversation tactile");

  const sectionButton = page.getByLabel(/^Replier (Clubs|Gestion|Généraux|Épinglés)$/).first();
  if (await sectionButton.isVisible().catch(() => false)) {
    const before = (await sectionButton.innerText()).trim();
    await sectionButton.click();
    const collapsed = page.getByLabel(/^Déplier (Clubs|Gestion|Généraux|Épinglés)$/).first();
    await collapsed.waitFor({ state: "visible", timeout: 2500 }).catch(() => {});
    const collapsedText = (await collapsed.innerText().catch(() => "")).trim();
    check(!/(^|\s)0($|\s)/.test(collapsedText), "Messages : aucune catégorie repliée n’affiche 0", `avant: ${before}; après: ${collapsedText}`);
  }

  const announcement = page.getByLabel(/Nouvelle annonce non lue|Ouvrir Annonce/).first();
  if (await announcement.isVisible().catch(() => false)) {
    await checkTarget(announcement, "Annonce : carte tactile");
    if ((await announcement.getAttribute("aria-label")) === "Nouvelle annonce non lue") {
      const text = (await announcement.innerText()).trim();
      check(text.includes("NOUVEAU"), "Annonce : état non lu clairement signalé");
      check(text.length > 20, "Annonce : contenu non lu visible directement", `longueur: ${text.length}`);
      await checkTarget(page.getByLabel("Marquer l'annonce comme lue", { exact: true }), "Annonce : J’ai lu tactile");
    }
  }

  await page.getByRole("tab", { name: /Privées/ }).click();
  check(await page.getByPlaceholder("Rechercher une conversation…").isVisible(), "Messages : contenu Privées actif");
  await page.getByRole("tab", { name: /Groupes/ }).click();
  check(await page.getByPlaceholder("Rechercher un club ou un groupe…").isVisible(), "Messages : retour Groupes actif");
}

async function auditCoworking(page) {
  await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
  const portal = page.getByRole("button", { name: /Coworking/ }).first();
  await checkTarget(portal, "Coworking : portail central tactile");
  await portal.click();
  await waitRoute(page, "/coworking", "Coworking : ouverture Map en un tap");

  check((await page.getByText("J’entre", { exact: true }).count()) === 0, "Coworking : aucun bouton J’entre sur la Map");
  check((await page.getByText("Focus", { exact: true }).count()) === 0, "Coworking : aucun ancien statut Focus sur la Map");
  check((await page.getByText("En pause", { exact: true }).count()) === 0, "Coworking : aucun ancien statut Pause sur la Map");
  check(await page.getByText("Disponible", { exact: true }).first().isVisible(), "Coworking : légende Disponible visible");
  check(await page.getByText("Occupé", { exact: true }).first().isVisible(), "Coworking : légende Occupé visible");
  await checkTarget(page.getByLabel("Fermer le coworking", { exact: true }), "Coworking : fermeture tactile");
  await checkTarget(page.getByLabel("Actualiser le coworking", { exact: true }), "Coworking : actualisation tactile");
  await checkTarget(page.getByLabel("Rejoindre la salle générale", { exact: true }), "Coworking : Salle générale tactile");

  const frame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");
  const mapRoot = frame.locator("#map");
  await mapRoot.waitFor({ state: "visible", timeout: 7000 }).catch(() => {});
  check(await mapRoot.isVisible().catch(() => false), "Coworking : vraie carte géographique visible");

  const allMarkers = frame.locator(".cw-marker");
  const markerCount = await allMarkers.count().catch(() => 0);
  check(markerCount > 0, "Coworking : membres connectés visibles sur la carte", `marqueurs: ${markerCount}`);
  check((await frame.locator(".cw-marker.available").count().catch(() => 0)) > 0, "Coworking : au moins une personne disponible verte");
  check((await frame.locator(".cw-marker.busy").count().catch(() => 0)) > 0, "Coworking : au moins une visio occupée rouge");
  check((await frame.locator(".cw-media.group").count().catch(() => 0)) > 0, "Coworking : visio de groupe rendue en mosaïque");

  const availableMarker = frame.locator(".cw-marker.available").first();
  if (await availableMarker.isVisible().catch(() => false)) {
    await availableMarker.click();
    await page.getByLabel("Dire bonjour", { exact: true }).waitFor({ state: "visible", timeout: 2500 }).catch(() => {});
    await checkTarget(page.getByLabel("Dire bonjour", { exact: true }), "Coworking : Bonjour tactile");
    await checkTarget(page.getByLabel("Proposer un rendez-vous", { exact: true }), "Coworking : rendez-vous tactile");
    check((await page.getByLabel("Toquer pour rejoindre la visio", { exact: true }).count()) === 0, "Coworking : pas de Toquer sur une personne disponible hors visio");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
    await page.getByLabel("Fermer la fiche", { exact: true }).waitFor({ state: "detached", timeout: 2500 }).catch(() => {});
  }

  const busyMarker = frame.locator(".cw-marker.busy").first();
  if (await busyMarker.isVisible().catch(() => false)) {
    await busyMarker.click();
    await page.getByLabel("Toquer pour rejoindre la visio", { exact: true }).waitFor({ state: "visible", timeout: 2500 }).catch(() => {});
    await checkTarget(page.getByLabel("Dire bonjour", { exact: true }), "Coworking groupe : Bonjour tactile");
    await checkTarget(page.getByLabel("Toquer pour rejoindre la visio", { exact: true }), "Coworking groupe : Toquer tactile");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
    await page.getByLabel("Fermer la fiche", { exact: true }).waitFor({ state: "detached", timeout: 2500 }).catch(() => {});
  }

  await page.getByLabel("Rejoindre la salle générale", { exact: true }).click();
  await waitRoute(page, "/coworking/hub", "Coworking : entrée Salle générale");
  await page.getByText("Salle générale", { exact: true }).first().waitFor({ state: "visible", timeout: 7000 }).catch(() => {});
  check(await page.getByText("Salle générale", { exact: true }).first().isVisible().catch(() => false), "Salle générale : titre visible");
  check(await page.getByText("Touchez l’espace pour vous déplacer", { exact: true }).isVisible().catch(() => false), "Salle générale : mécanique spatiale compréhensible");
  await checkTarget(page.getByLabel("Espace de déplacement de la Salle générale", { exact: true }), "Salle générale : espace de déplacement tactile", 120);
  await checkTarget(page.getByLabel(/Couper le micro|Activer le micro/), "Salle générale : micro tactile");
  await checkTarget(page.getByLabel(/Couper la caméra|Activer la caméra/), "Salle générale : caméra tactile");
  await checkTarget(page.getByLabel("Quitter la salle", { exact: true }).last(), "Salle générale : sortie tactile");
  check((await page.getByText("Focus", { exact: true }).count()) === 0, "Salle générale : aucun mode Focus hérité");
  check((await page.getByText("En pause", { exact: true }).count()) === 0, "Salle générale : aucun mode Pause hérité");

  await page.getByLabel("Retour à la Map sans quitter", { exact: true }).click();
  await waitRoute(page, "/coworking", "Salle générale : retour Map sans quitter");
}

async function auditChat(page) {
  await page.goto(`${BASE_URL}/chat/carcassonne`, { waitUntil: "networkidle" });
  const composer = page.getByLabel("Écrire un message", { exact: true });
  const send = page.getByLabel("Envoyer le message", { exact: true });
  await checkTarget(send, "Chat : Envoyer tactile");
  check(await composer.isVisible(), "Chat : composer visible");

  const body = `Audit suivi dernier message ${Date.now()}`;
  await composer.fill(body);
  await send.click();
  const sent = await sentMessageSurface(page, body);
  check(Boolean(sent), "Chat : message envoyé visible");
  if (sent) {
    const text = await sent.innerText().catch(() => "");
    check(text.includes(body), "Chat : contenu du message réellement rendu", text.slice(0, 120));
    const box = await sent.boundingBox().catch(() => null);
    if (box) {
      const viewport = page.viewportSize();
      const top = box.y;
      const bottom = box.y + box.height;
      check(bottom <= (viewport?.height ?? 852) + 1 && top >= -1, "Chat : écran suit automatiquement le dernier message envoyé", `top=${Math.round(top)}, bottom=${Math.round(bottom)}`);
    } else failures.push("Chat : géométrie du dernier message indisponible");
  }

  const translationToggle = page.getByLabel(/Afficher le contenu original|Afficher la traduction/).first();
  if (await translationToggle.isVisible().catch(() => false)) await checkTarget(translationToggle, "Chat : bascule traduction tactile", 44);

  const voice = page.getByLabel("Lire le message vocal").first();
  if (await voice.isVisible().catch(() => false)) {
    await checkTarget(voice, "Chat : lecteur vocal tactile");
    check((await page.getByText("Transcription", { exact: true }).count()) > 0 || (await page.getByText(/Transcription en cours|Transcription indisponible/).count()) > 0, "Chat : état transcription vocal présent");
  }
}

async function auditSecondaryFlows(page) {
  await page.goto(`${BASE_URL}/highlights`, { waitUntil: "networkidle" });
  check(await page.getByLabel("Écrire une publication rapide", { exact: true }).isVisible(), "Temps forts : publication rapide visible");
  const mapTab = page.getByRole("tab", { name: "Afficher la carte" });
  await mapTab.click();
  check(await page.locator("iframe[title='Carte de découverte Neptune']").isVisible(), "Temps forts : Map découverte visible");
  await page.getByRole("tab", { name: "Afficher le Feed" }).click();
  check(await page.getByLabel("Écrire une publication rapide", { exact: true }).isVisible(), "Temps forts : retour Feed fonctionnel");

  await page.goto(`${BASE_URL}/calls`, { waitUntil: "networkidle" });
  check(pathOf(page).endsWith("/calls"), "Appels : écran accessible");

  await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
  const language = page.getByLabel("Changer la langue de Connexio").last();
  await checkTarget(language, "Profil : réglage langue tactile");
  await language.click();
  check(await page.getByText("Langue de Connexio", { exact: true }).last().isVisible(), "Profil : sélecteur langue fonctionnel");
  await page.getByLabel("Fermer").last().click();

  for (const route of ["/account", "/notification-settings", "/privacy"]) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
    check(pathOf(page).endsWith(route), `${route} : écran accessible`);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      locale: "fr-FR",
      colorScheme: "dark",
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await auditMainNavigation(page);
    await auditMessages(page);
    await auditCoworking(page);
    await auditChat(page);
    await auditSecondaryFlows(page);

    const relevantConsoleErrors = consoleErrors.filter((message) => !/favicon|leaflet.*404|net::ERR_BLOCKED_BY_CLIENT/i.test(message));
    check(pageErrors.length === 0, "Application : aucune erreur JavaScript", pageErrors.join(" | "));
    check(relevantConsoleErrors.length === 0, "Application : aucune erreur console critique", relevantConsoleErrors.join(" | "));
    await context.close();
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error("Interaction audit failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("Interaction audit passed: navigation, messaging auto-follow, geographic Coworking, green/red presence, video mosaic, hello/knock, General Room spatial UX, chat voice, Feed/Map, calls, account, notifications and privacy.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});