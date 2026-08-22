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
      await open(page, "/coworking");
      await shot(page, `coworking-map-${viewport.suffix}`);
      await page.close();
    }

    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
    await open(page, "/coworking");
    const mapFrame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");
    const busyMarker = mapFrame.locator(".cw-marker.busy").first();
    if (await busyMarker.isVisible().catch(() => false)) {
      await busyMarker.click();
      await shot(page, "coworking-group-sheet-393x852");
      await page.getByLabel("Fermer la fiche", { exact: true }).click().catch(() => {});
    } else {
      const anyMarker = mapFrame.locator(".cw-marker").first();
      if (await anyMarker.isVisible().catch(() => false)) {
        await anyMarker.click();
        await shot(page, "coworking-person-sheet-393x852");
        await page.getByLabel("Fermer la fiche", { exact: true }).click().catch(() => {});
      }
    }

    const generalRoom = page.getByLabel("Rejoindre la salle générale", { exact: true });
    if (await generalRoom.isVisible().catch(() => false)) {
      await generalRoom.click();
      await page.getByText("Salle générale", { exact: true }).first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      await shot(page, "coworking-general-room-393x852");
      const roomMember = page.getByRole("button", { name: /caméra active|^[A-ZÀ-ÿ][^,]{2,}$/ }).filter({ hasNotText: "Quitter" }).first();
      if (await roomMember.isVisible().catch(() => false)) {
        await roomMember.click();
        if (await page.getByLabel("Inviter dans un bureau privé", { exact: true }).isVisible().catch(() => false)) {
          await shot(page, "coworking-general-room-member-393x852");
        }
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

    const calls = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
    await open(calls, "/calls");
    await shot(calls, "calls-393x852");
    await calls.close();

    const settings = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
    await open(settings, "/settings");
    await shot(settings, "settings-393x852", true);
    await settings.close();

    const account = await browser.newPage({ viewport: { width: 393, height: 852 }, locale: "fr-FR", colorScheme: "dark", reducedMotion: "reduce" });
    await open(account, "/account");
    await shot(account, "account-393x852", true);
    await account.close();

    fs.writeFileSync(
      path.join(output, "README.txt"),
      "Captures réelles du build web V24 géographique + parcours principaux, générées avant toute nouvelle build Expo.\n"
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
