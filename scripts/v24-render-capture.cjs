const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");

const root = path.resolve(process.cwd(), "web-product-audit-dist");
const output = path.resolve(process.cwd(), "v24-render-review");
const port = 4193;

function resolveFile(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requested = clean === "/" ? "index.html" : clean.replace(/^\//, "");
  const full = path.resolve(root, requested);
  if (full.startsWith(root) && fs.existsSync(full) && fs.statSync(full).isFile()) return full;
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
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ttf": "font/ttf",
    ".mp3": "audio/mpeg"
  }[ext] || "application/octet-stream";
}

function browserExecutable() {
  return [process.env.CHROMIUM_PATH, "/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome"]
    .filter(Boolean)
    .find((candidate) => fs.existsSync(candidate));
}

const server = http.createServer((request, response) => {
  const file = resolveFile(request.url);
  response.writeHead(200, { "Content-Type": mime(file), "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(response);
});

async function settle(page, delay = 700) {
  await page.waitForTimeout(delay);
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(180);
}

async function shot(page, name, fullPage = false) {
  await settle(page);
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage });
}

async function open(page, route) {
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "domcontentloaded" });
  await settle(page, 500);
}

async function captureSimpleRoute(browser, route, name, fullPage = false) {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
  await open(page, route);
  await shot(page, name, fullPage);
  await page.close();
}

async function run() {
  if (!fs.existsSync(path.join(root, "index.html"))) throw new Error("Build web-product-audit-dist absent");
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error("Chromium introuvable");
  const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  try {
    for (const viewport of [
      { width: 393, height: 852, suffix: "393x852" },
      { width: 280, height: 568, suffix: "280x568" }
    ]) {
      const page = await browser.newPage({ viewport, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
      await open(page, "/messages");
      await shot(page, `messages-groups-${viewport.suffix}`);
      const privateTab = page.getByRole("tab", { name: /Privées/ });
      if (await privateTab.isVisible().catch(() => false)) {
        await privateTab.click();
        await shot(page, `messages-private-${viewport.suffix}`);
      }
      await open(page, "/coworking");
      await shot(page, `coworking-map-${viewport.suffix}`);
      await page.close();
    }

    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
    await open(page, "/coworking");
    const mapFrame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");

    const availableMarker = mapFrame.locator(".cw-marker.available").first();
    if (await availableMarker.isVisible().catch(() => false)) {
      await availableMarker.click();
      await shot(page, "coworking-available-person-sheet-393x852");
      await page.getByLabel("Fermer la fiche", { exact: true }).click().catch(() => {});
    }

    const busyMarker = mapFrame.locator(".cw-marker.busy").first();
    if (await busyMarker.isVisible().catch(() => false)) {
      await busyMarker.click();
      await shot(page, "coworking-busy-group-sheet-393x852");
      await page.getByLabel("Fermer la fiche", { exact: true }).click().catch(() => {});
    }

    const generalRoom = page.getByLabel("Rejoindre la salle générale", { exact: true });
    if (await generalRoom.isVisible().catch(() => false)) {
      await generalRoom.click();
      await page.getByText("Salle générale", { exact: true }).first().waitFor({ state: "visible", timeout: 7000 }).catch(() => {});
      await shot(page, "coworking-general-room-393x852");
      const stage = page.getByLabel("Espace de déplacement de la Salle générale", { exact: true });
      const stageBox = await stage.boundingBox().catch(() => null);
      if (stageBox) {
        await page.mouse.click(stageBox.x + stageBox.width * 0.72, stageBox.y + stageBox.height * 0.68);
        await shot(page, "coworking-general-room-after-move-393x852");
      }
    }
    await page.close();

    const chat = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
    await open(chat, "/chat/carcassonne");
    await shot(chat, "chat-393x852");
    const voice = chat.getByLabel("Lire le message vocal").first();
    if (await voice.isVisible().catch(() => false)) {
      await voice.scrollIntoViewIfNeeded();
      await shot(chat, "chat-voice-player-393x852");
    }
    const translationToggle = chat.getByLabel(/Afficher le contenu original|Afficher la traduction/).first();
    if (await translationToggle.isVisible().catch(() => false)) {
      await translationToggle.scrollIntoViewIfNeeded();
      await shot(chat, "chat-translation-toggle-393x852");
    }
    await chat.close();

    const highlights = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
    await open(highlights, "/highlights");
    await shot(highlights, "highlights-feed-393x852");
    const mapTab = highlights.getByRole("tab", { name: "Afficher la carte" });
    if (await mapTab.isVisible().catch(() => false)) {
      await mapTab.click();
      await shot(highlights, "highlights-map-393x852");
    }
    await highlights.close();

    await captureSimpleRoute(browser, "/new-conversation", "new-conversation-393x852");
    await captureSimpleRoute(browser, "/contacts", "contacts-393x852");
    await captureSimpleRoute(browser, "/profile/user-lea", "member-profile-393x852", true);
    await captureSimpleRoute(browser, "/schedule-call?memberId=user-lea&mode=video", "schedule-call-393x852", true);
    await captureSimpleRoute(browser, "/contact-actions?intent=recommend&recipientId=user-lea", "recommend-contact-393x852", true);
    await captureSimpleRoute(browser, "/contact-actions?intent=invite", "invite-contact-393x852", true);
    await captureSimpleRoute(browser, "/new-highlight", "new-highlight-393x852");
    await captureSimpleRoute(browser, "/calls", "calls-393x852");
    await captureSimpleRoute(browser, "/settings", "settings-393x852", true);
    await captureSimpleRoute(browser, "/account", "account-393x852", true);
    await captureSimpleRoute(browser, "/notification-settings", "notification-settings-393x852", true);
    await captureSimpleRoute(browser, "/privacy", "privacy-393x852", true);
    await captureSimpleRoute(browser, "/blocked-users", "blocked-users-393x852", true);

    fs.writeFileSync(
      path.join(output, "README.txt"),
      [
        "Captures réelles du build web V24 avant toute nouvelle build Expo.",
        "Couverture : Messages Groupes/Privées 393 et 280, Map Coworking 393 et 280, fiche disponible, mosaïque occupée, Salle générale avant/après déplacement, chat/vocal/traduction, Temps forts Feed/Map, nouvelle conversation, contacts, profil membre, programmation d’appel, recommandation/invitation de contact, nouveau Temps fort, appels, profil, compte, notifications, confidentialité et utilisateurs bloqués.",
        ""
      ].join("\n")
    );
    console.log(`V24 whole-app render review generated in ${output}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
