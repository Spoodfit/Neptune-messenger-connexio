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
  return [process.env.CHROMIUM_PATH, "/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome"]
    .filter(Boolean).find((candidate) => fs.existsSync(candidate));
}

async function expectVisible(locator, label, timeout = 7000) {
  try { await locator.waitFor({ state: "visible", timeout }); return true; }
  catch { failures.push(`${label}: élément attendu absent`); return false; }
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

async function auditCenterMapButton(page, label) {
  await open(page, "/messages");
  const button = page.getByLabel("Ouvrir la Map", { exact: true });
  if (await expectVisible(button, `${label} bouton Map`)) {
    const box = await button.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport || Math.abs(box.x + box.width / 2 - viewport.width / 2) > 2.5) failures.push(`${label}: bouton Map non centré`);
  }
  const viewport = page.viewportSize();
  const compact = Boolean(viewport && viewport.width < 310);
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
  await expectVisible(page.getByText("Map", { exact: true }).first(), `${label} Map`);
  if (await page.getByText("Salle générale", { exact: true }).count()) failures.push(`${label}: Salle générale encore visible`);
  if (await page.getByLabel("Rejoindre la salle générale", { exact: true }).count()) failures.push(`${label}: action Salle générale encore accessible`);
  await checkGeometry(page, `${label} écran Map`);

  const frame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");
  await expectVisible(frame.locator("#map"), `${label} carte Leaflet`);
  if ((await frame.locator(".cw-marker.available").count()) === 0) failures.push(`${label}: aucun utilisateur disponible vert`);
  if ((await frame.locator(".cw-marker.busy").count()) === 0) failures.push(`${label}: aucune visio occupée rouge`);
  if ((await frame.locator(".cw-group .cw-satellite").count()) === 0) failures.push(`${label}: groupe visio sans cercles satellites`);
  if ((await frame.locator(".event-marker .event-flag").count()) === 0) failures.push(`${label}: événements drapeaux absents`);
  if ((await frame.locator(".cw-status,.cw-camera,.cw-media").count()) > 0) failures.push(`${label}: anciens badges/rectangles visio encore présents`);

  const sizes = await frame.locator(".cw-core").evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().width)).filter(Boolean));
  if (sizes.some((size) => size < 27 || size > 50)) failures.push(`${label}: taille adaptative des cercles hors bornes (${sizes.join(",")})`);

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
  if (faceGeometry.visible === 0) failures.push(`${label}: aucun visage de membre réellement visible dans le viewport`);
  if (faceGeometry.blank > 0) failures.push(`${label}: ${faceGeometry.blank} cercle(s) membre visuellement vide(s)`);

  if (!interactive) return;

  const available = frame.locator(".cw-marker.available").first();
  if (await available.isVisible().catch(() => false)) {
    await available.click();
    await expectVisible(page.getByLabel("Toquer et entrer", { exact: true }), "Disponible: Toquer & entrer");
    await expectVisible(page.getByLabel("Dire bonjour", { exact: true }), "Disponible: Bonjour");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
  }

  const busy = frame.locator(".cw-marker.busy").first();
  if (await busy.isVisible().catch(() => false)) {
    await busy.click();
    await expectVisible(page.getByLabel("Toquer et demander l’autorisation d’entrer", { exact: true }), "Occupé: demande d'autorisation");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
  }

  const event = frame.locator(".event-marker").first();
  if (await event.isVisible().catch(() => false)) {
    await event.click();
    await expectVisible(page.getByLabel("Voir l’évènement", { exact: true }), "Évènement: fiche et CTA");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
  }

  for (let i = 0; i < 6; i += 1) {
    const zoomAnchor = frame.locator(".cw-marker.busy:visible .cw-hit").first();
    const anchorBox = await zoomAnchor.boundingBox().catch(() => null);
    if (anchorBox) await page.mouse.move(anchorBox.x + anchorBox.width / 2, anchorBox.y + anchorBox.height / 2);
    else await frame.locator("#map").hover();
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(650);
  const visibleClusters = await frame.locator(".cluster-core").evaluateAll((nodes) => nodes.filter((node) => {
    const r = node.getBoundingClientRect(); const s = getComputedStyle(node);
    return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight && s.display !== "none" && s.visibility !== "hidden";
  }).length);
  if (visibleClusters > 0) failures.push("Map zoomée: clusters encore visibles alors que l’espace permet le dégroupage automatique");

  const splitGeometry = await frame.locator(".cw-group.zoom-split").evaluateAll((groups) => {
    let visiblePeople = 0;
    let splitGroups = 0;
    let minimumGap = Infinity;
    const inViewport = (rect) => rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
    for (const group of groups) {
      const core = group.querySelector(".cw-core");
      if (!core) continue;
      const coreRect = core.getBoundingClientRect();
      if (!inViewport(coreRect)) continue;
      splitGroups += 1;
      visiblePeople += 1;
      const coreCenter = { x: coreRect.left + coreRect.width / 2, y: coreRect.top + coreRect.height / 2 };
      for (const person of group.querySelectorAll(".cw-person-marker")) {
        const rect = person.getBoundingClientRect();
        if (!inViewport(rect)) continue;
        visiblePeople += 1;
        const distance = Math.hypot(rect.left + rect.width / 2 - coreCenter.x, rect.top + rect.height / 2 - coreCenter.y);
        minimumGap = Math.min(minimumGap, distance);
      }
    }
    return { splitGroups, visiblePeople, minimumGap: Number.isFinite(minimumGap) ? minimumGap : 0 };
  });
  if (splitGeometry.splitGroups === 0 || splitGeometry.visiblePeople < 2) failures.push("Map zoomée: utilisateurs non dégroupés automatiquement");
  if (splitGeometry.splitGroups > 0 && splitGeometry.minimumGap < 42) failures.push(`Map zoomée: séparation des personnes insuffisante (${Math.round(splitGeometry.minimumGap)}px)`);

  const hostCollisions = await frame.locator(".cw-core").evaluateAll((nodes) => {
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
  if (hostCollisions > 0) failures.push(`Map zoomée: ${hostCollisions} chevauchement(s) important(s) entre cercles principaux`);
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
    await auditMap(page, "393x852 interactif", true);
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
    console.log("Product Audit V25 passed: centered Map navigation, feed-only Temps forts, event flags, circular video satellites, adaptive marker density, automatic zoom split, availability knock logic, no General Room, and core-route geometry.");
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
