const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");

const root = path.resolve(process.cwd(), "web-product-audit-dist");
const port = 4189;
const failures = [];

function resolveFile(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requested = clean === "/" ? "index.html" : clean.replace(/^\//, "");
  const full = path.resolve(root, requested);
  if (!full.startsWith(root)) return path.join(root, "index.html");
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  return path.join(root, "index.html");
}

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2"
  }[ext] || "application/octet-stream";
}

const server = http.createServer((request, response) => {
  const file = resolveFile(request.url);
  if (!fs.existsSync(file)) {
    response.writeHead(404);
    response.end("Build web absent");
    return;
  }
  response.writeHead(200, { "Content-Type": mime(file), "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(response);
});

function browserExecutable() {
  return [process.env.CHROMIUM_PATH, "/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome"]
    .filter(Boolean)
    .find((candidate) => fs.existsSync(candidate));
}

async function expectVisible(locator, label, timeout = 7000) {
  try {
    await locator.waitFor({ state: "visible", timeout });
    return true;
  } catch {
    failures.push(`${label}: élément attendu absent`);
    return false;
  }
}

async function checkGeometry(page, label, minimum = 44) {
  const result = await page.evaluate(({ minimum }) => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const interactiveSelector = ["button", "a[href]", "input", "textarea", "[role='button']", "[role='tab']", "[role='switch']"].join(",");
    const labelFor = (element) => (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().replace(/\s+/g, " ").slice(0, 90);
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && style.pointerEvents !== "none" && Number(style.opacity || "1") > 0.02 && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewport.height && rect.right > 0 && rect.left < viewport.width;
    };
    const controls = [...document.querySelectorAll(interactiveSelector)].filter(visible).map((element) => {
      const rect = element.getBoundingClientRect();
      return { label: labelFor(element), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    });
    const clipped = controls.filter((item) => item.left < -1 || item.right > viewport.width + 1);
    const undersized = controls.filter((item) => item.width < minimum || item.height < minimum);
    const overlaps = [];
    for (let i = 0; i < controls.length; i += 1) {
      for (let j = i + 1; j < controls.length; j += 1) {
        const a = controls[i], b = controls[j];
        const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (w <= 1 || h <= 1) continue;
        const ratio = (w * h) / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
        if (ratio > 0.42) overlaps.push({ a: a.label, b: b.label, ratio });
      }
    }
    return {
      viewport,
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > viewport.width + 1,
      clipped,
      undersized,
      overlaps
    };
  }, { minimum });

  if (result.horizontalOverflow) failures.push(`${label}: débordement horizontal global`);
  if (result.clipped.length) failures.push(`${label}: contrôles coupés: ${result.clipped.slice(0, 5).map((item) => item.label).join(", ")}`);
  if (result.undersized.length) failures.push(`${label}: cibles < ${minimum}px: ${result.undersized.slice(0, 6).map((item) => `${item.label} ${Math.round(item.width)}x${Math.round(item.height)}`).join(", ")}`);
  if (result.overlaps.length) failures.push(`${label}: contrôles qui se chevauchent: ${result.overlaps.slice(0, 4).map((item) => `${item.a}/${item.b}`).join(", ")}`);
}

async function runtimeProbe(page, route, label) {
  const errors = [];
  const onPageError = (error) => errors.push(String(error));
  const onConsole = (message) => {
    if (message.type() === "error" && !/favicon|ERR_BLOCKED_BY_CLIENT/i.test(message.text())) errors.push(message.text());
  };
  page.on("pageerror", onPageError);
  page.on("console", onConsole);
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(750);
  await checkGeometry(page, label);
  if (errors.length) failures.push(`${label}: erreurs runtime: ${errors.slice(0, 3).join(" | ")}`);
  page.off("pageerror", onPageError);
  page.off("console", onConsole);
}

async function auditCoworking(page, sizeLabel) {
  await page.goto(`http://127.0.0.1:${port}/coworking`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(900);
  await expectVisible(page.getByText("Coworking", { exact: true }).first(), `${sizeLabel} Coworking`);
  await expectVisible(page.getByText("Disponible", { exact: true }).first(), `${sizeLabel} légende disponible`);
  await expectVisible(page.getByText("Occupé", { exact: true }).first(), `${sizeLabel} légende occupé`);
  await expectVisible(page.getByLabel("Rejoindre la salle générale", { exact: true }), `${sizeLabel} Salle générale`);
  if ((await page.getByText("J’entre", { exact: true }).count()) > 0) failures.push(`${sizeLabel} Coworking: ancien bouton J’entre encore présent`);
  if ((await page.getByText("Focus", { exact: true }).count()) > 0) failures.push(`${sizeLabel} Coworking: ancien statut Focus encore présent`);
  await checkGeometry(page, `${sizeLabel} Coworking géographique`);

  const frame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");
  await expectVisible(frame.locator("#map"), `${sizeLabel} carte géographique`);
  const markerCount = await frame.locator(".cw-marker").count().catch(() => 0);
  if (markerCount === 0) failures.push(`${sizeLabel} Coworking: aucun membre connecté sur la carte`);
  const groupCount = await frame.locator(".cw-media.group").count().catch(() => 0);
  if (groupCount === 0) failures.push(`${sizeLabel} Coworking: aucun groupe visio en mosaïque dans les données de QA`);
}

async function auditInteractiveCoworking(page) {
  await page.goto(`http://127.0.0.1:${port}/coworking`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(850);
  const frame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");
  const available = frame.locator(".cw-marker.available").first();
  const busy = frame.locator(".cw-marker.busy").first();

  if (await available.isVisible().catch(() => false)) {
    await available.click();
    await expectVisible(page.getByLabel("Dire bonjour", { exact: true }), "fiche disponible : bonjour");
    await expectVisible(page.getByLabel("Proposer un rendez-vous", { exact: true }), "fiche disponible : rendez-vous");
    if ((await page.getByLabel("Toquer pour rejoindre la visio", { exact: true }).count()) > 0) failures.push("fiche disponible : Toquer proposé alors que le membre n’est pas en visio");
    await checkGeometry(page, "fiche personne disponible");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
  } else failures.push("Coworking : aucune personne disponible verte dans les données de QA");

  if (await busy.isVisible().catch(() => false)) {
    await busy.click();
    await expectVisible(page.getByLabel("Toquer pour rejoindre la visio", { exact: true }), "fiche visio : Toquer");
    await expectVisible(page.getByLabel("Dire bonjour", { exact: true }), "fiche visio : Bonjour");
    await checkGeometry(page, "fiche groupe visio");
    await page.getByLabel("Fermer la fiche", { exact: true }).click();
  } else failures.push("Coworking : aucun groupe occupé rouge dans les données de QA");

  await page.getByLabel("Rejoindre la salle générale", { exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith("/coworking/hub"), { timeout: 5000 }).catch(() => {});
  await expectVisible(page.getByText("Salle générale", { exact: true }).first(), "Salle générale ouverte");
  await expectVisible(page.getByText("Touchez l’espace pour vous déplacer", { exact: true }), "Salle générale : explication déplacement");
  await expectVisible(page.getByLabel(/Couper le micro|Activer le micro/), "Salle générale : micro");
  await expectVisible(page.getByLabel(/Couper la caméra|Activer la caméra/), "Salle générale : caméra");
  await checkGeometry(page, "Salle générale");
  if ((await page.getByText("Focus", { exact: true }).count()) > 0 || (await page.getByText("En pause", { exact: true }).count()) > 0) {
    failures.push("Salle générale : anciens états Focus/Pause encore visibles");
  }
}

async function auditMessaging(page) {
  await page.goto(`http://127.0.0.1:${port}/messages`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await expectVisible(page.getByLabel("Nouvelle conversation", { exact: true }), "Messages : nouvelle conversation");
  await checkGeometry(page, "Messages principal");

  const section = page.getByLabel(/^Replier (Clubs|Gestion|Généraux|Épinglés)$/).first();
  if (await section.isVisible().catch(() => false)) {
    await section.click();
    const collapsed = page.getByLabel(/^Déplier (Clubs|Gestion|Généraux|Épinglés)$/).first();
    const text = await collapsed.innerText().catch(() => "");
    if (/(^|\s)0($|\s)/.test(text)) failures.push(`Messages : compteur 0 inutile après repli (${text.trim()})`);
  }

  await page.goto(`http://127.0.0.1:${port}/chat/carcassonne`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(550);
  const input = page.getByLabel("Écrire un message", { exact: true });
  const send = page.getByLabel("Envoyer le message", { exact: true });
  const body = `QA dernier message ${Date.now()}`;
  await input.fill(body);
  await send.click();
  const sent = page.getByText(body, { exact: true });
  await expectVisible(sent, "Chat : message envoyé");
  const box = await sent.boundingBox().catch(() => null);
  const viewport = page.viewportSize();
  if (!box || box.top < -1 || box.bottom > (viewport?.height ?? 844) + 1) failures.push("Chat : dernier message envoyé n’est pas suivi automatiquement à l’écran");
  await checkGeometry(page, "Chat après envoi");
}

async function auditAppRoutes(page) {
  const routes = [
    ["/highlights", "Temps forts"],
    ["/calls", "Appels"],
    ["/settings", "Profil/Paramètres"],
    ["/account", "Compte"],
    ["/notification-settings", "Notifications"],
    ["/privacy", "Confidentialité"],
    ["/contacts", "Contacts"],
    ["/new-highlight", "Nouveau Temps fort"]
  ];
  for (const [route, label] of routes) {
    await runtimeProbe(page, route, label);
  }
}

async function run() {
  if (!fs.existsSync(path.join(root, "index.html"))) throw new Error("Le build web-product-audit-dist est absent.");
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error("Chromium est introuvable.");
  const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  try {
    const sizes = [[280, 568], [320, 568], [390, 844], [430, 720], [768, 1024], [1024, 768]];
    for (const [width, height] of sizes) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce", locale: "fr-FR", colorScheme: "dark" });
      await runtimeProbe(page, "/messages", `${width}x${height} Messages`);
      await auditCoworking(page, `${width}x${height}`);
      await page.close();
    }

    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
    await auditMessaging(page);
    await auditInteractiveCoworking(page);
    await auditAppRoutes(page);
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  if (failures.length) {
    console.error("Product Audit failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("Product Audit passed: six viewport families, geographic Coworking, green/red availability, video mosaics, General Room proximity UX, messaging follow, core routes, geometry and runtime health.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
