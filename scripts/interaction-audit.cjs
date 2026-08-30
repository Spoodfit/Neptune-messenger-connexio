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

async function intersectionRatio(locator) {
  return locator.evaluate((element) => new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      resolve(value);
    };
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      finish(entry ? entry.intersectionRatio : 0);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    observer.observe(element);
    setTimeout(() => finish(0), 350);
  })).catch(() => 0);
}

async function waitForFrameCount(locator, timeout = 7000) {
  await locator.first().waitFor({ state: "attached", timeout }).catch(() => {});
  return locator.count().catch(() => 0);
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
  await checkTarget(page.getByLabel("Ouvrir la Map", { exact: true }), "Navigation : Map centrale tactile");

  const mapButton = await visibleLocator(page.getByLabel("Ouvrir la Map", { exact: true }));
  if (mapButton) {
    const box = await mapButton.boundingBox();
    const viewport = page.viewportSize();
    if (box && viewport) check(Math.abs(box.x + box.width / 2 - viewport.width / 2) <= 3, "Navigation : Map réellement centrée");
  }

  await page.getByRole("tab", { name: /Privées/ }).click();
  check(await page.getByPlaceholder("Rechercher une conversation…").isVisible(), "Messages : contenu Privées actif");
  await page.getByRole("tab", { name: /Groupes/ }).click();
  check(await page.getByPlaceholder("Rechercher un club ou un groupe…").isVisible(), "Messages : retour Groupes actif");
}

async function waitForMapSheet(page) {
  await page.getByLabel("Fermer la fiche", { exact: true }).waitFor({ state: "visible", timeout: 3500 }).catch(() => {});
}

async function expandVisibleMapClusters(frame, attempts = 8) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const cluster = frame.locator(".cluster-core:visible").first();
    if (!(await cluster.isVisible().catch(() => false))) return;
    await cluster.click({ force: true }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 420));
  }
}

async function auditMap(page) {
  await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
  const portal = await checkTarget(page.getByLabel("Ouvrir la Map", { exact: true }), "Map : portail central tactile");
  if (!portal) return;
  await portal.click();
  await waitRoute(page, "/coworking", "Map : ouverture en un tap");

  check(await page.getByText("Radar Connexio", { exact: true }).first().isVisible().catch(() => false), "Map : titre orienté usage visible");
  check(await page.getByLabel("Afficher tous les membres et évènements", { exact: true }).isVisible().catch(() => false), "Map : filtre Tout visible");
  check(await page.getByLabel("Afficher les membres disponibles", { exact: true }).isVisible().catch(() => false), "Map : filtre Disponibles visible");
  check(await page.getByLabel("Afficher les évènements", { exact: true }).isVisible().catch(() => false), "Map : filtre Évènements visible");
  check((await page.getByText("Salle générale", { exact: true }).count()) === 0, "Map V25 : aucune Salle générale");
  check((await page.getByLabel("Rejoindre la salle générale", { exact: true }).count()) === 0, "Map V25 : aucune action Salle générale");
  await checkTarget(page.getByLabel("Fermer la Map", { exact: true }), "Map : fermeture tactile");
  await checkTarget(page.getByLabel("Actualiser la Map", { exact: true }), "Map : actualisation tactile");
  const availability = await checkTarget(page.getByLabel(/^Ma disponibilité : (Disponible|Occupé)$/), "Map : disponibilité personnelle tactile");
  if (availability) {
    const initialLabel = await availability.getAttribute("aria-label");
    await availability.click();
    const nextLabel = initialLabel?.endsWith("Disponible") ? "Ma disponibilité : Occupé" : "Ma disponibilité : Disponible";
    if (nextLabel) check(await page.getByLabel(nextLabel, { exact: true }).isVisible().catch(() => false), "Map : disponibilité modifiable en un toucher");
  }

  const frame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");
  const mapRoot = frame.locator("#map");
  await mapRoot.waitFor({ state: "visible", timeout: 7000 }).catch(() => {});
  check(await mapRoot.isVisible().catch(() => false), "Map : carte Leaflet visible");

  const availableMarkers = frame.locator(".cw-marker.available");
  const busyMarkers = frame.locator(".cw-marker.busy");
  const groupSatellites = frame.locator(".cw-group .cw-satellite");
  const eventCalendars = frame.locator(".event-marker .event-calendar");
  const initialClusterCount = await waitForFrameCount(frame.locator(".cluster-core"));
  await expandVisibleMapClusters(frame);
  const [availableCount, busyCount, satelliteCount, eventCalendarCount] = await Promise.all([
    waitForFrameCount(availableMarkers),
    waitForFrameCount(busyMarkers),
    waitForFrameCount(groupSatellites),
    waitForFrameCount(eventCalendars)
  ]);
  check(availableCount > 0 || initialClusterCount > 0, "Map : personnes disponibles présentes ou regroupées");
  check(busyCount > 0 || initialClusterCount > 0, "Map : visios occupées présentes ou regroupées");
  check(satelliteCount > 0 || initialClusterCount > 0, "Map : groupe visio présent ou regroupé");
  check(eventCalendarCount > 0 || initialClusterCount > 0, "Map : événements datés présents ou regroupés");

  const faceGeometry = await frame.locator(".cw-face").evaluateAll((faces) => {
    const inViewport = (rect) => rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
    let visible = 0;
    let blank = 0;
    for (const face of faces) {
      const rect = face.getBoundingClientRect();
      if (!inViewport(rect)) continue;
      visible += 1;
      const fallback = face.querySelector(".cw-fallback");
      const image = face.querySelector("img");
      const video = face.querySelector("video.video-ready");
      const fallbackVisible = Boolean(fallback && fallback.textContent?.trim() && Number(getComputedStyle(fallback).opacity) > .2);
      const imageVisible = Boolean(image && image.complete && image.naturalWidth > 0 && Number(getComputedStyle(image).opacity) > .2);
      const videoVisible = Boolean(video && Number(getComputedStyle(video).opacity) > .2);
      if (!fallbackVisible && !imageVisible && !videoVisible) blank += 1;
    }
    return { visible, blank };
  });
  check(faceGeometry.visible > 0 || initialClusterCount > 0, "Map : visage visible après dégroupage ou cluster régional présent");
  check(faceGeometry.blank === 0, "Map : aucun cercle membre visuellement vide", `vides=${faceGeometry.blank}`);

  const available = frame.locator(".cw-marker.available .cw-hit").first();
  if (await available.isVisible().catch(() => false)) {
    await available.click();
    await waitForMapSheet(page);
    await checkTarget(page.getByLabel("Dire bonjour", { exact: true }), "Map disponible : Bonjour tactile");
    await checkTarget(page.getByLabel("Inviter en visio", { exact: true }), "Map disponible : Inviter en visio tactile");
    await checkTarget(page.getByLabel("Proposer un rendez-vous", { exact: true }), "Map disponible : rendez-vous tactile");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
    await page.getByLabel("Fermer la fiche", { exact: true }).waitFor({ state: "detached", timeout: 2500 }).catch(() => {});
  }

  const busy = frame.locator(".cw-marker.busy .cw-hit").first();
  if (await busy.isVisible().catch(() => false)) {
    await busy.click();
    await waitForMapSheet(page);
    await checkTarget(page.getByLabel("Dire bonjour au groupe", { exact: true }), "Map occupée : Bonjour adressé au groupe");
    await checkTarget(page.getByLabel("Toquer à l’espace et demander l’autorisation d’entrer", { exact: true }), "Map occupée : demande adressée à l’espace");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
    await page.getByLabel("Fermer la fiche", { exact: true }).waitFor({ state: "detached", timeout: 2500 }).catch(() => {});
  }

  // The visible flag can be offset from its immutable geographic anchor to
  // prevent overlap. Exercise the translated surface the user actually taps.
  const event = frame.locator(".event-marker .event-hit").first();
  if (await event.isVisible().catch(() => false)) {
    await event.click();
    await waitForMapSheet(page);
    await checkTarget(page.getByLabel("Voir l’évènement", { exact: true }), "Map événement : CTA tactile");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
  }
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
    const ratio = await intersectionRatio(sent);
    check(ratio >= 0.5, "Chat : écran suit automatiquement le dernier message envoyé", `intersection=${Math.round(ratio * 100)} %`);
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
  check((await page.getByLabel("Afficher la carte", { exact: true }).count()) === 0, "Temps forts V25 : aucun ancien onglet Map");
  check((await page.getByRole("tab", { name: /Feed|Map/ }).count()) === 0, "Temps forts V25 : aucun switch Feed/Map");

  await page.goto(`${BASE_URL}/calls`, { waitUntil: "networkidle" });
  check(pathOf(page).endsWith("/calls"), "Appels : écran accessible");

  await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
  const language = page.getByLabel("Changer la langue de Connexio").last();
  await checkTarget(language, "Profil : réglage langue tactile");
  await language.click();
  check(await page.getByText("Langue de Connexio", { exact: true }).last().isVisible(), "Profil : sélecteur langue fonctionnel");
  await page.getByLabel("Fermer").last().click();

  for (const route of ["/account", "/notification-settings", "/privacy", "/contacts"]) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
    check(pathOf(page).endsWith(route), `${route} : écran accessible`);
  }

  await page.goto(`${BASE_URL}/new-highlight`, { waitUntil: "networkidle" });
  const composeUrl = new URL(page.url());
  check(composeUrl.pathname.replace(/\/$/, "").endsWith("/highlights") && composeUrl.searchParams.get("compose") === "1", "/new-highlight : redirection compositeur valide", page.url());
  const openComposer = page.getByPlaceholder("Partagez simplement ce que vous voulez…", { exact: true });
  await openComposer.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  check(await openComposer.isVisible().catch(() => false), "/new-highlight : compositeur ouvert et prêt à saisir après redirection");
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
    await auditMap(page);
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
    console.error("Interaction audit V25 failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("Interaction audit V25 passed: navigation, centered Map, green/red presence, circular video groups, event flags, hello/knock, feed-only Temps forts, messaging follow, voice, calls, account, notifications and privacy.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
