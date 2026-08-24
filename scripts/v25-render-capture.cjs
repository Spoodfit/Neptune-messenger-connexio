const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");

const root = path.resolve(process.cwd(), "web-product-audit-dist");
const output = path.resolve(process.cwd(), "v26-render-review");
const port = 4193;

function resolveFile(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requested = clean === "/" ? "index.html" : clean.replace(/^\//, "");
  const full = path.resolve(root, requested);
  if (full.startsWith(root) && fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  return path.join(root, "index.html");
}
function mime(file) {
  return ({ ".html":"text/html; charset=utf-8", ".js":"application/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json", ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml", ".ttf":"font/ttf", ".mp3":"audio/mpeg" })[path.extname(file).toLowerCase()] || "application/octet-stream";
}
function browserExecutable() {
  return [process.env.CHROMIUM_PATH, chromium.executablePath(), "/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome"].filter(Boolean).find((candidate) => fs.existsSync(candidate));
}
const server = http.createServer((request, response) => {
  const file = resolveFile(request.url);
  response.writeHead(200, { "Content-Type": mime(file), "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(response);
});
async function settle(page, delay = 650) { await page.waitForTimeout(delay); await page.evaluate(() => document.fonts?.ready).catch(() => {}); await page.waitForTimeout(150); }
async function open(page, route) { await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "domcontentloaded" }); await settle(page); }
async function shot(page, name, fullPage = false) { await settle(page, 300); await page.screenshot({ path: path.join(output, `${name}.png`), fullPage }); }

async function run() {
  if (!fs.existsSync(path.join(root, "index.html"))) throw new Error("Build web-product-audit-dist absent");
  fs.rmSync(output, { recursive: true, force: true }); fs.mkdirSync(output, { recursive: true });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const executablePath = browserExecutable(); if (!executablePath) throw new Error("Chromium introuvable");
  const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    for (const viewport of [{ width:393,height:852,suffix:"393x852" },{ width:280,height:568,suffix:"280x568" }]) {
      const page = await browser.newPage({ viewport, locale:"fr-FR", colorScheme:"dark", reducedMotion:"reduce" });
      await open(page, "/messages"); await shot(page, `navigation-map-centered-${viewport.suffix}`);
      await open(page, "/highlights"); await shot(page, `temps-forts-feed-only-${viewport.suffix}`);
      await open(page, "/coworking"); await shot(page, `map-dedicated-${viewport.suffix}`);
      await open(page, "/coworking/visio-business");
      await page.getByTestId("coworking-focus-avatar").waitFor({ state:"visible", timeout:10000 }).catch(() => {});
      await shot(page, `private-video-main-${viewport.suffix}`);
      const overview = page.getByLabel("Afficher la vue d’ensemble", { exact:true });
      if (await overview.isVisible().catch(() => false)) {
        await overview.click();
        await page.getByTestId("coworking-overview-grid").waitFor({ state:"visible", timeout:3000 }).catch(() => {});
        await shot(page, `private-video-overview-${viewport.suffix}`);
      }
      await open(page, "/schedule-call?memberId=user-lea&mode=video");
      await shot(page, `schedule-call-${viewport.suffix}`);
      await page.close();
    }

    const page = await browser.newPage({ viewport:{ width:393,height:852 }, locale:"fr-FR", colorScheme:"dark", reducedMotion:"reduce" });
    await open(page, "/coworking");
    const mapFrame = page.frameLocator("iframe[title='Carte géographique du Coworking Connexio']");
    const available = mapFrame.locator(".cw-marker.available").first();
    if (await available.isVisible().catch(() => false)) { await available.click(); await shot(page, "map-available-profile-393x852"); await page.getByLabel("Fermer la fiche", { exact:true }).click().catch(() => {}); }
    const busy = mapFrame.locator(".cw-marker.busy").first();
    if (await busy.isVisible().catch(() => false)) { await busy.click(); await shot(page, "map-video-satellites-393x852"); await page.getByLabel("Fermer la fiche", { exact:true }).click().catch(() => {}); }
    const event = mapFrame.locator(".event-marker").first();
    if (await event.isVisible().catch(() => false)) {
      await event.click();
      await page.mouse.move(20, 180);
      await shot(page, "map-event-flag-sheet-393x852");
      await page.getByLabel("Fermer la fiche", { exact:true }).click().catch(() => {});
    }
    for (let i=0;i<6;i+=1) {
      const zoomAnchor = mapFrame.locator(".cw-marker.busy:visible .cw-hit").first();
      const anchorBox = await zoomAnchor.boundingBox().catch(() => null);
      if (anchorBox) await page.mouse.move(anchorBox.x+anchorBox.width/2,anchorBox.y+anchorBox.height/2);
      else await mapFrame.locator("#map").hover();
      await page.mouse.wheel(0,-900);
      await page.waitForTimeout(160);
    }
    const splitGroup = mapFrame.locator(".cw-group.zoom-split:visible").first();
    await splitGroup.waitFor({ state:"visible", timeout:3000 });
    const splitOnScreen = await splitGroup.evaluate((group) => {
      const rect = group.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
    });
    if (!splitOnScreen) throw new Error("La capture zoomée ne contient aucun groupe visio dans le viewport");
    await page.mouse.move(20, 180);
    await shot(page, "map-zoomed-declustered-393x852");
    await page.close();

    for (const [route,name,full] of [
      ["/chat/carcassonne","chat-393x852",false], ["/calls","calls-393x852",false], ["/settings","settings-393x852",true],
      ["/profile/user-lea","member-profile-393x852",true], ["/schedule-call?memberId=user-lea&mode=video","schedule-call-393x852",true],
      ["/new-conversation","new-conversation-393x852",true], ["/contacts","contacts-393x852",true], ["/new-highlight","new-highlight-393x852",true],
      ["/notification-settings","notification-settings-393x852",true], ["/privacy","privacy-393x852",true], ["/blocked-users","blocked-users-393x852",true]
    ]) {
      const p = await browser.newPage({ viewport:{ width:393,height:852 }, locale:"fr-FR", colorScheme:"dark", reducedMotion:"reduce" });
      await open(p, route); await shot(p, name, full); await p.close();
    }

    fs.writeFileSync(path.join(output, "README.txt"), "Captures réelles V26 avant toute build Expo : Map, disponibilité, événements, visio principale et vue d’ensemble circulaire, programmation d’appel et principaux parcours.\n");
    console.log(`V26 render review generated in ${output}`);
  } finally {
    await browser.close(); await new Promise((resolve) => server.close(resolve));
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
