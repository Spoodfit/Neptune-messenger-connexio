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

async function auditMap(page) {
  await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
  const portal = await checkTarget(page.getByLabel("Ouvrir la Map", { exact: true }), "Map : portail central tactile");
  if (!portal) return;
  await portal.click();
  await waitRoute(page, "/coworking", "Map : ouverture en un tap");

  check(await page.getByText("Map", { exact: true }).first().isVisible().catch(() => false), "Map : titre visible");
  check(await page.getByText("Disponible", { exact: true }).first().isVisible().catch(() => false), "Map : légende Disponible visible");
  check(await page.getByText("Occupé", { exact: true }).first().isVisible().catch(() => false), "Map : légende Occupé visible");
  check(await page.getByText("Évènement", { exact: true }).first().isVisible().catch(() => false), "Map : légende Évènement visible");
  check((await page.getByText("Salle générale", { exact: true }).count()) === 0, "Map V25 : aucune Salle générale");
  check((await page.getByLabel("Rejoindre la salle générale", { exact: true }).count()) === 0, "Map V25 : aucune action Salle générale");
  await checkTarget(page.getByLabel("Fermer la Map", { exact: true }), "Map : fermeture tactile");
  await checkTarget(page.getByLabel("Actualiser la Map", { exact: true }), "Map : actualisation tactile");

  const frame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");
  const mapRoot = frame.locator("#map");
  await mapRoot.waitFor({ state: "visible", timeout: 7000 }).catch(() => {});
  check(await mapRoot.isVisible().catch(() => false), "Map : carte Leaflet visible");

  const availableMarkers = frame.locator(".cw-marker.available");
  const busyMarkers = frame.locator(".cw-marker.busy");
  const groupSatellites = frame.locator(".cw-group .cw-satellite");
  const eventFlags = frame.locator(".event-marker .event-flag");
  const [availableCount, busyCount, satelliteCount, eventFlagCount] = await Promise.all([
    waitForFrameCount(availableMarkers),
    waitForFrameCount(busyMarkers),
    waitForFrameCount(groupSatellites),
    waitForFrameCount(eventFlags)
  ]);
  check(availableCount > 0, "Map : au moins une personne disponible verte");
  check(busyCount > 0, "Map : au moins une visio occupée rouge");
  check(satelliteCount > 0, "Map : visio de groupe en cercles satellites");
  check(eventFlagCount > 0, "Map : événements en drapeaux");

  const available = availableMarkers.first();
  if (await available.isVisible().catch(() => false)) {
    await available.click();
    await waitForMapSheet(page);
    await checkTarget(page.getByLabel("Dire bonjour", { exact: true }), "Map disponible : Bonjour tactile");
    await checkTarget(page.getByLabel("Toquer et entrer", { exact: true }), "Map disponible : Toquer & entrer tactile");
    await checkTarget(page.getByLabel("Proposer un rendez-vous", { exact: true }), "Map disponible : rendez-vous tactile");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
    await page.getByLabel("Fermer la fiche", { exact: true }).waitFor({ state: "detached", timeout: 2500 }).catch(() => {});
  }

  const busy = busyMarkers.first();
  if (await busy.isVisible().catch(() => false)) {
    await busy.click();
    await waitForMapSheet(page);
    await checkTarget(page.getByLabel("Dire bonjour", { exact: true }), "Map occupée : Bonjour tactile");
    await checkTarget(page.getByLabel("Toquer et demander l’autorisation d’entrer", { exact: true }), "Map occupée : demande d’entrée tactile");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
    await page.getByLabel("Fermer la fiche", { exact: true }).waitFor({ state: "detached", timeout: 2500 }).catch(() => {});
  }

  const event = frame.locator(".event-marker").first();
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
