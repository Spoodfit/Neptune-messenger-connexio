const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");

const root = path.resolve(process.cwd(), "web-product-audit-dist");
const port = 4191;
const failures = [];

function resolveFile(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requested = clean === "/" ? "index.html" : clean.replace(/^\//, "");
  const full = path.resolve(root, requested);
  if (full.startsWith(root) && fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  return path.join(root, "index.html");
}

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png",
    ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".mp3": "audio/mpeg"
  })[ext] || "application/octet-stream";
}

const server = http.createServer((request, response) => {
  const file = resolveFile(request.url);
  response.writeHead(200, { "Content-Type": mime(file), "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(response);
});

function browserExecutable() {
  return [process.env.CHROMIUM_PATH, chromium.executablePath(), "/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome"]
    .filter(Boolean).find((candidate) => fs.existsSync(candidate));
}

async function expectVisible(locator, label, timeout = 7000) {
  try { await locator.waitFor({ state: "visible", timeout }); return true; }
  catch { failures.push(`${label}: élément attendu absent`); return false; }
}

async function expandVisibleMapClusters(frame, attempts = 8) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const cluster = frame.locator(".cluster-core:visible").first();
    if (!(await cluster.isVisible().catch(() => false))) return;
    await cluster.click({ force: true }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 420));
  }
}

async function auditDenseLocation(page, label) {
  const iframe = page.locator("iframe[title='Carte géographique du Coworking Connexio']");
  const source = await iframe.getAttribute("srcdoc");
  const markerMatch = source?.match(/const markerData=([\s\S]*?);\n  const eventData=/);
  if (!source || !markerMatch) {
    failures.push(`${label}: source de carte indisponible pour le scénario dense`);
    return;
  }
  const currentMarkers = JSON.parse(markerMatch[1]);
  const anchor = currentMarkers[0];
  if (!anchor) {
    failures.push(`${label}: aucun point d’ancrage pour le scénario dense`);
    return;
  }
  const denseMarker = {
    ...anchor,
    id: "product-audit:dense-100",
    availability: "busy",
    memberCount: 100,
    members: Array.from({ length: 3 }, (_, index) => ({
      id: `product-audit:member-${index}`,
      name: `Membre ${index + 1}`,
      initials: `M${index + 1}`,
      cameraOn: false
    }))
  };
  const denseSource = source
    .replace(/const markerData=[\s\S]*?;\n  const eventData=/, `const markerData=${JSON.stringify([denseMarker])};\n  const eventData=`)
    .replace(/const eventData=[\s\S]*?;\n  const focusLocation=/, "const eventData=[];\n  const focusLocation=");
  await iframe.evaluate((node, srcdoc) => { node.srcdoc = srcdoc; }, denseSource);
  const frame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");
  await frame.locator(".cw-hub").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const geometry = await frame.locator(".cw-hub").evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      faces: node.querySelectorAll(".cw-hub-face").length,
      count: node.querySelector(".cw-hub-count")?.textContent?.trim() ?? "",
      legacyRadialElements: document.querySelectorAll(".cw-room-zone,.cw-satellite,.zoom-split").length
    };
  }).catch(() => null);
  if (!geometry) failures.push(`${label}: hub de 100 membres non rendu`);
  else {
    if (geometry.width > 136 || geometry.height > 62) failures.push(`${label}: hub de 100 membres trop grand (${geometry.width}x${geometry.height})`);
    if (geometry.faces !== 3) failures.push(`${label}: le hub dense rend ${geometry.faces} visages au lieu de 3`);
    if (geometry.count !== "100") failures.push(`${label}: compteur dense incorrect (${geometry.count || "vide"})`);
    if (geometry.legacyRadialElements) failures.push(`${label}: ${geometry.legacyRadialElements} ancien(s) élément(s) radial(aux) dans le scénario dense`);
  }
  const closeSheet = page.getByLabel("Fermer la fiche", { exact: true }).first();
  if (await closeSheet.isVisible().catch(() => false)) await closeSheet.click().catch(() => {});
  fs.mkdirSync(path.resolve(process.cwd(), "v26-render-review"), { recursive: true });
  await page.screenshot({ path: path.resolve(process.cwd(), "v26-render-review", "radar-dense-100.png"), fullPage: false });
}

async function checkGeometry(page, label, minimum = 44) {
  const result = await page.evaluate(({ minimum }) => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const selector = ["button", "a[href]", "input", "textarea", "[role='button']", "[role='tab']", "[role='switch']"].join(",");
    const visible = (element) => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && style.pointerEvents !== "none" && Number(style.opacity || "1") > .02 && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewport.height && rect.right > 0 && rect.left < viewport.width;
    };
    const labelFor = (element) => (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().replace(/\s+/g, " ").slice(0, 80);
    const controls = [...document.querySelectorAll(selector)].filter(visible).map((element) => ({ element, label: labelFor(element), rect: element.getBoundingClientRect() }));
    return {
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > viewport.width + 1,
      undersized: controls.filter(({ rect }) => rect.width < minimum || rect.height < minimum).map(({ label, rect }) => `${label} ${Math.round(rect.width)}x${Math.round(rect.height)}`).slice(0, 8),
      clipped: controls.filter(({ rect }) => rect.left < -1 || rect.right > viewport.width + 1).map(({ label }) => label).slice(0, 8)
    };
  }, { minimum });
  if (result.overflow) failures.push(`${label}: débordement horizontal`);
  if (result.undersized.length) failures.push(`${label}: cibles < ${minimum}px: ${result.undersized.join(", ")}`);
  if (result.clipped.length) failures.push(`${label}: contrôles coupés: ${result.clipped.join(", ")}`);
}

async function open(page, route) {
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(850);
}

async function auditScheduleCallInitialPosition(page) {
  await open(page, "/schedule-call?memberId=user-lea&mode=video");
  const scrollState = await page.evaluate(() => {
    const scrollers = [...document.querySelectorAll("*")].filter((node) => {
      const style = getComputedStyle(node);
      return /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
    });
    return {
      pageY: window.scrollY,
      nestedMax: Math.max(0, ...scrollers.map((node) => node.scrollTop))
    };
  });
  if (scrollState.pageY > 1 || scrollState.nestedMax > 1) failures.push(`Programmation: écran déplacé automatiquement vers l’objet (${scrollState.pageY}/${scrollState.nestedMax}px)`);
  await expectVisible(page.getByText("Léa Despoulins", { exact: true }), "Programmation: membre visible à l’ouverture");
  await expectVisible(page.getByText("Type d’appel", { exact: true }), "Programmation: type visible à l’ouverture");
}

async function auditCenterMapButton(page, label) {
  await open(page, "/messages");
  const button = page.getByLabel("Ouvrir la Map", { exact: true });
  if (await expectVisible(button, `${label} bouton Map`)) {
    const box = await button.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport || Math.abs(box.x + box.width / 2 - viewport.width / 2) > 2.5) failures.push(`${label}: bouton Map non centré`);
  }
  const countBadge = page.getByTestId("coworking-active-count");
  if (await expectVisible(countBadge, `${label} compteur Map`)) {
    const badgeVisibility = await countBadge.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      let visible = { left: Math.max(0, rect.left), top: Math.max(0, rect.top), right: Math.min(window.innerWidth, rect.right), bottom: Math.min(window.innerHeight, rect.bottom) };
      for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (!/(hidden|clip|scroll|auto)/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)) continue;
        const parentRect = ancestor.getBoundingClientRect();
        visible = { left: Math.max(visible.left, parentRect.left), top: Math.max(visible.top, parentRect.top), right: Math.min(visible.right, parentRect.right), bottom: Math.min(visible.bottom, parentRect.bottom) };
      }
      const area = Math.max(0, visible.right - visible.left) * Math.max(0, visible.bottom - visible.top);
      return { ratio: area / Math.max(1, rect.width * rect.height), text: node.textContent?.trim() ?? "" };
    });
    if (!/^\d+(?:\+)?$/.test(badgeVisibility.text)) failures.push(`${label}: compteur Map illisible (${badgeVisibility.text || "vide"})`);
    if (badgeVisibility.ratio < .98) failures.push(`${label}: compteur Map rogné (${Math.round(badgeVisibility.ratio * 100)}% visible)`);
  }
  const viewport = page.viewportSize();
  const compact = Boolean(viewport && viewport.width < 350);
  const messagesTab = page.getByRole("tab", { name: /^Messages(?:,|$)/ });
  for (const [tab, visibleLabel] of [[messagesTab, "Messages"], [page.getByRole("tab", { name: "Temps forts", exact: true }), compact ? "Temps" : "Temps forts"]]) {
    const labelNode = tab.getByText(visibleLabel, { exact: true });
    if (await expectVisible(labelNode, `${label} libellé ${visibleLabel}`)) {
      const box = await labelNode.boundingBox();
      if (!box || box.height > 15) failures.push(`${label}: libellé ${visibleLabel} sur plusieurs lignes (${Math.round(box?.height ?? 0)}px)`);
      const clipped = await labelNode.evaluate((node) => node.scrollWidth > node.clientWidth + 1);
      if (clipped) failures.push(`${label}: libellé ${visibleLabel} tronqué horizontalement`);
    }
  }
  if (compact && await button.isVisible().catch(() => false) && await messagesTab.isVisible().catch(() => false)) {
    const [buttonBox, tabBox] = await Promise.all([
      button.boundingBox(),
      messagesTab.boundingBox()
    ]);
    if (!buttonBox || !tabBox || buttonBox.y < tabBox.y - 4) failures.push(`${label}: bouton Map compact déborde au-dessus de la navigation`);
  }
  await checkGeometry(page, `${label} navigation`);
}

async function auditFeedOnly(page) {
  await open(page, "/highlights");
  await expectVisible(page.getByText("Temps forts", { exact: true }).first(), "Temps forts");
  if (await page.getByLabel("Afficher la carte", { exact: true }).count()) failures.push("Temps forts: ancien onglet Map encore présent");
  if (await page.getByRole("tab", { name: /Feed|Map/ }).count()) failures.push("Temps forts: switch Feed/Map encore présent");
  await expectVisible(page.getByLabel("Écrire une publication rapide", { exact: true }), "Temps forts: compositeur visible directement");
  await checkGeometry(page, "Temps forts feed-only");
}

async function auditMap(page, label, interactive = false) {
  await open(page, "/coworking");
  await expectVisible(page.getByText("Radar Connexio", { exact: true }).first(), `${label} Radar Connexio`);
  await expectVisible(page.getByRole("tab", { name: /Messages/ }), `${label} navigation principale conservée`);
  const availability = page.getByLabel(/^Ma disponibilité : (Disponible|Occupé)$/);
  if (await expectVisible(availability, `${label} disponibilité personnelle`)) {
    const box = await availability.boundingBox();
    if (!box || box.width < 48 || box.height < 48) failures.push(`${label}: changement de disponibilité trop petit (${Math.round(box?.width ?? 0)}x${Math.round(box?.height ?? 0)}px)`);
  }
  if (await page.getByText("Salle générale", { exact: true }).count()) failures.push(`${label}: Salle générale encore visible`);
  if (await page.getByLabel("Rejoindre la salle générale", { exact: true }).count()) failures.push(`${label}: action Salle générale encore accessible`);
  await expectVisible(page.getByTestId("radar-opportunity-pulse"), `${label} Pulse compact par défaut`);
  if (await page.getByTestId("radar-opportunity-panel").count()) failures.push(`${label}: panneau d’opportunités encore déployé par défaut`);
  await expectVisible(page.getByTestId("radar-filter-trigger"), `${label} filtre compact`);
  if (await page.getByTestId("radar-filter-menu").count()) failures.push(`${label}: menu de filtres ouvert par défaut`);
  await checkGeometry(page, `${label} écran Map`);

  const frame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");
  await expectVisible(frame.locator("#map"), `${label} carte Leaflet`);
  const initialClusterCount = await frame.locator(".cluster-core").count();
  await expandVisibleMapClusters(frame);
  if ((await frame.locator(".cw-marker.available").count()) === 0 && initialClusterCount === 0) failures.push(`${label}: aucun utilisateur disponible ni cluster régional`);
  if ((await frame.locator(".cw-marker.busy").count()) === 0 && initialClusterCount === 0) failures.push(`${label}: aucune visio occupée ni cluster régional`);
  if ((await frame.locator(".cw-group .cw-hub").count()) === 0 && initialClusterCount === 0) failures.push(`${label}: hub visio absent du cluster régional`);
  if ((await frame.locator(".event-marker .event-calendar").count()) === 0 && initialClusterCount === 0) failures.push(`${label}: événements datés absents du cluster régional`);
  if ((await frame.locator(".cw-status,.cw-camera,.cw-media").count()) > 0) failures.push(`${label}: anciens badges/rectangles visio encore présents`);

  const sizes = await frame.locator(".cw-avatar-stage").evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().height)).filter(Boolean));
  if (sizes.some((size) => size < 52 || size > 78)) failures.push(`${label}: taille adaptative des personnages hors bornes (${sizes.join(",")})`);

  const hubs = await frame.locator(".cw-hub").evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height), faces: node.querySelectorAll(".cw-hub-face").length };
  }));
  if (hubs.some((hub) => hub.width > 136 || hub.height > 62)) failures.push(`${label}: un hub visio masque excessivement la carte (${JSON.stringify(hubs)})`);
  if (hubs.some((hub) => hub.faces > 3)) failures.push(`${label}: plus de trois visages affichés dans un hub (${JSON.stringify(hubs)})`);

  const faceGeometry = await frame.locator(".cw-face").evaluateAll((faces) => {
    const inViewport = (rect) => rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
    let visible = 0;
    let blank = 0;
    for (const face of faces) {
      const rect = face.getBoundingClientRect();
      if (!inViewport(rect)) continue;
      visible += 1;
      const fallback = face.querySelector(".cw-fallback");
      const images = [...face.querySelectorAll("img")];
      const video = face.querySelector("video.video-ready");
      const fallbackVisible = Boolean(fallback && fallback.textContent?.trim() && Number(getComputedStyle(fallback).opacity) > .2);
      const imageVisible = images.some((image) => image.complete && image.naturalWidth > 0 && Number(getComputedStyle(image).opacity) > .2);
      const videoVisible = Boolean(video && Number(getComputedStyle(video).opacity) > .2);
      if (!fallbackVisible && !imageVisible && !videoVisible) blank += 1;
    }
    return { visible, blank };
  });
  if (faceGeometry.visible === 0 && initialClusterCount === 0) failures.push(`${label}: aucun visage ni cluster régional visible`);
  if (faceGeometry.blank > 0) failures.push(`${label}: ${faceGeometry.blank} personnage(s) membre visuellement vide(s)`);

  const eventProfileCollisions = await frame.locator("body").evaluate(() => {
    const visibleRects = (selector) => [...document.querySelectorAll(selector)]
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight);
    const events = visibleRects(".event-visual");
    const people = visibleRects(".cw-avatar-stage,.cw-hub");
    return events.reduce((total, eventRect) => total + people.filter((personRect) => {
      const width = Math.max(0, Math.min(eventRect.right, personRect.right) - Math.max(eventRect.left, personRect.left));
      const height = Math.max(0, Math.min(eventRect.bottom, personRect.bottom) - Math.max(eventRect.top, personRect.top));
      return width > 2 && height > 2;
    }).length, 0);
  });
  if (eventProfileCollisions > 0) failures.push(`${label}: ${eventProfileCollisions} superposition(s) visible(s) entre date d’évènement et profil`);

  if (!interactive) return;

  const pulse = page.getByTestId("radar-opportunity-pulse");
  if (await pulse.isVisible().catch(() => false)) {
    await pulse.click();
    await expectVisible(page.getByTestId("radar-opportunity-panel"), "Pulse: développement à la demande");
    await page.getByLabel("Réduire ce panneau", { exact: true }).click();
    await expectVisible(pulse, "Pulse: réduction explicite");

    await pulse.click();
    const recenter = page.getByLabel("Recentrer la carte", { exact: true });
    if (await recenter.isVisible().catch(() => false)) {
      await recenter.click();
      await expectVisible(pulse, "Pulse: réduction automatique pendant une manipulation de carte");
    }
  }

  const initialAvailabilityLabel = await availability.getAttribute("aria-label").catch(() => null);
  if (initialAvailabilityLabel) {
    await availability.click();
    const expectedAvailabilityLabel = initialAvailabilityLabel.endsWith("Disponible")
      ? "Ma disponibilité : Occupé"
      : "Ma disponibilité : Disponible";
    await expectVisible(page.getByLabel(expectedAvailabilityLabel, { exact: true }), "Disponibilité: bascule en un toucher");
  }

  const available = frame.locator(".cw-marker.available .cw-hit").first();
  if (await available.isVisible().catch(() => false)) {
    await available.click();
    await expectVisible(page.getByLabel("Inviter en visio", { exact: true }), "Disponible: invitation visio sans toquement");
    if (await page.getByLabel(/Toquer/, { exact: false }).count()) failures.push("Disponible: Toquer proposé hors espace actif");
    await expectVisible(page.getByLabel("Dire bonjour", { exact: true }), "Disponible: Bonjour");
    await page.getByLabel("Dire bonjour", { exact: true }).click();
    const helloMotion = page.getByTestId("coworking-action-motion");
    await expectVisible(helloMotion, "Bonjour: animation de main visible");
    const helloMotionOpacity = Number(await helloMotion.evaluate((node) => getComputedStyle(node).opacity).catch(() => 0));
    if (helloMotionOpacity < 0.5) failures.push(`Bonjour: animation montée mais transparente (${helloMotionOpacity})`);
    await expectVisible(page.getByText(/Bonjour · \d+s/), "Bonjour: délai anti-spam visible");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
  }

  const busy = frame.locator(".cw-marker.busy .cw-hit").first();
  if (await busy.isVisible().catch(() => false)) {
    await busy.click();
    await expectVisible(page.getByLabel("Dire bonjour au groupe", { exact: true }), "Occupé: Bonjour adressé au groupe");
    await expectVisible(page.getByLabel("Toquer à l’espace et demander l’autorisation d’entrer", { exact: true }), "Occupé: demande adressée à l’espace");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
  }

  // The marker keeps its exact geographic anchor while `.event-visual` is
  // translated to avoid people. Click the translated hit surface, not the
  // invisible anchor box that may legitimately remain behind a member.
  const event = frame.locator(".event-marker .event-hit").first();
  if (await event.isVisible().catch(() => false)) {
    await event.click();
    await expectVisible(page.getByLabel("Voir l’évènement", { exact: true }), "Évènement: fiche et CTA");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
    await expectVisible(page.getByTestId("radar-opportunity-pulse"), "Évènement: retour au Pulse compact");
  }

  await expandVisibleMapClusters(frame, 10);
  await page.waitForTimeout(650);
  const visibleClusters = await frame.locator(".cluster-core").evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
    return { visible: rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight && style.display !== "none" && style.visibility !== "hidden", width: Math.round(rect.width), height: Math.round(rect.height) };
  }).filter((cluster) => cluster.visible));
  if (visibleClusters.some((cluster) => cluster.width > 210 || cluster.height > 48)) failures.push(`Map zoomée: agrégat trop encombrant (${JSON.stringify(visibleClusters)})`);

  const hostCollisions = await frame.locator(".cw-avatar-stage,.cw-hub").evaluateAll((nodes) => {
    const rects = nodes.map((node) => node.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight);
    let collisions = 0;
    for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i], b = rects[j];
      const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if ((w * h) / Math.max(1, Math.min(a.width * a.height, b.width * b.height)) > .48) collisions += 1;
    }
    return collisions;
  });
  if (hostCollisions > 0) failures.push(`Map zoomée: ${hostCollisions} chevauchement(s) important(s) entre personnages principaux`);

  await auditDenseLocation(page, `${label} dense`);
}

async function auditPrivateRoom(page) {
  await open(page, "/coworking/visio-business");
  const tiles = page.locator('[data-testid^="coworking-participant-"]');
  await tiles.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  const tileCount = await tiles.count();
  if (tileCount < 2) failures.push(`Visio privée: seulement ${tileCount} participant visible dans la grille`);
  const stageBox = await page.getByTestId("coworking-room-stage").boundingBox();
  const tileBoxes = (await Promise.all(Array.from({ length: tileCount }, (_, index) => tiles.nth(index).boundingBox()))).filter(Boolean);
  const coverage = stageBox
    ? tileBoxes.reduce((total, box) => total + box.width * box.height, 0) / Math.max(1, stageBox.width * stageBox.height)
    : 0;
  if (!stageBox || coverage < .7 || tileBoxes.some((box) => box.width < stageBox.width * .38 || box.height < stageBox.height * .22)) {
    const geometry = {
      stage: stageBox && [Math.round(stageBox.width), Math.round(stageBox.height)],
      coverage: Number(coverage.toFixed(3)),
      tiles: tileBoxes.map((box) => [Math.round(box.width), Math.round(box.height), Math.round(box.x), Math.round(box.y)])
    };
    failures.push(`Visio privée: la grille laisse une zone sombre inutilisée ou contient une tuile trop petite (${JSON.stringify(geometry)})`);
  }
  if (await page.getByText(/^(Principale|Ensemble)$/).count()) failures.push("Visio privée: ancien sélecteur de vues encore visible");
  if (await page.getByTestId("coworking-participant-rail").count()) failures.push("Visio privée: ancien rail dupliqué encore présent");
  await checkGeometry(page, "Visio privée");
}

async function auditScheduleCall(page) {
  await open(page, "/schedule-call?memberId=user-lea&mode=video");
  if (await page.getByText(/Standalone\s*:/).count()) failures.push("Programmer appel: texte technique Standalone encore visible");
  const subject = page.getByPlaceholder("Ex. Valider le partenariat", { exact: true });
  if (await expectVisible(subject, "Programmer appel: objet lisible sur une ligne")) {
    const wraps = await subject.evaluate((node) => node.scrollHeight > node.clientHeight + 1);
    if (wraps) failures.push("Programmer appel: placeholder de l’objet encore rogné ou multiligne");
  }
  await checkGeometry(page, "Programmer appel");
}

async function auditCoreRoutes(page) {
  for (const [route, label] of [
    ["/chat/carcassonne", "Chat"], ["/calls", "Appels"], ["/settings", "Profil"],
    ["/profile/user-lea", "Profil membre"], ["/schedule-call?memberId=user-lea&mode=video", "Programmer appel"],
    ["/new-conversation", "Nouvelle conversation"], ["/contacts", "Contacts"], ["/new-highlight", "Nouveau Temps fort"],
    ["/notification-settings", "Notifications"], ["/privacy", "Confidentialité"], ["/blocked-users", "Utilisateurs bloqués"]
  ]) {
    await open(page, route);
    await checkGeometry(page, label);
  }
}

async function run() {
  if (!fs.existsSync(path.join(root, "index.html"))) throw new Error("Build web-product-audit-dist absent");
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error("Chromium introuvable");
  const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    for (const [width, height] of [[280,568],[320,568],[393,852],[430,720],[768,1024],[1024,768]]) {
      const page = await browser.newPage({ viewport: { width, height }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
      await auditCenterMapButton(page, `${width}x${height}`);
      await auditMap(page, `${width}x${height}`, false);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
    await auditFeedOnly(page);
    await auditScheduleCallInitialPosition(page);
    await auditMap(page, "393x852 interactif", true);
    await auditPrivateRoom(page);
    await auditScheduleCall(page);
    await auditCoreRoutes(page);
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  if (failures.length) {
    console.error("Product Audit V25 failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Product Audit V26 passed: compact dense-location hubs, anchored event dates, one-touch availability, space-wide hello/knock, centered private video, and core-route geometry.");
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
