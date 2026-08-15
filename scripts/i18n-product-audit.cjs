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
  if (!full.startsWith(root)) return path.join(root, "index.html");
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  return path.join(root, "index.html");
}

const server = http.createServer((request, response) => {
  const file = resolveFile(request.url);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".html" ? "text/html; charset=utf-8" : ext === ".js" ? "application/javascript; charset=utf-8" : ext === ".css" ? "text/css; charset=utf-8" : "application/octet-stream";
  response.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(response);
});

function browserExecutable() {
  return [process.env.CHROMIUM_PATH, "/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome"].filter(Boolean).find(fs.existsSync);
}

async function expectText(page, text, label = text) {
  const locator = page.getByText(text, { exact: true }).last();
  try { await locator.waitFor({ state: "visible", timeout: 7000 }); }
  catch { failures.push(`${label}: texte attendu absent (${JSON.stringify(text)})`); }
}

async function clickExact(page, text, label = text) {
  const locator = page.getByText(text, { exact: true }).last();
  try {
    await locator.waitFor({ state: "visible", timeout: 7000 });
    await locator.click({ force: true });
    await page.waitForTimeout(250);
  } catch { failures.push(`${label}: impossible de cliquer ${JSON.stringify(text)}`); }
}

async function openLanguagePicker(page, currentLabel) {
  const byA11y = page.getByLabel(currentLabel, { exact: true }).last();
  if (await byA11y.isVisible().catch(() => false)) {
    await byA11y.scrollIntoViewIfNeeded().catch(() => undefined);
    await byA11y.click({ force: true });
    await page.waitForTimeout(200);
    return true;
  }
  const languageRow = page.getByText(/Langue|Language|Idioma|Sprache|Lingua/, { exact: true }).last();
  if (await languageRow.isVisible().catch(() => false)) {
    await languageRow.scrollIntoViewIfNeeded().catch(() => undefined);
    await languageRow.click({ force: true });
    await page.waitForTimeout(200);
    return true;
  }
  failures.push("sélecteur de langue introuvable");
  return false;
}

async function chooseLanguage(page, label) {
  const option = page.getByRole("radio").filter({ hasText: label }).last();
  try {
    await option.waitFor({ state: "visible", timeout: 7000 });
    await option.click({ force: true });
    await page.waitForTimeout(300);
  } catch { failures.push(`langue ${label}: option introuvable`); }
}

async function run() {
  if (!fs.existsSync(path.join(root, "index.html"))) throw new Error("Build web Product Audit absent.");
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error("Chromium introuvable.");
  const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(800);
    await clickExact(page, "Profil", "ouvrir Profil FR");
    await expectText(page, "Apparence", "profil FR avant changement");

    if (await openLanguagePicker(page, "Changer la langue de Connexio")) await chooseLanguage(page, "English");
    await expectText(page, "Profile", "navigation anglaise");
    await expectText(page, "Appearance", "apparence anglaise");
    await expectText(page, "Language", "langue anglaise");
    await expectText(page, "Account and security", "sécurité anglaise");
    await expectText(page, "Sign out", "déconnexion anglaise");

    await clickExact(page, "Messages", "ouvrir Messages EN");
    await expectText(page, "Private", "onglet privé anglais");
    await expectText(page, "Groups", "onglet groupes anglais");

    await clickExact(page, "Calls", "ouvrir Calls EN");
    await expectText(page, "Recent", "appels récents anglais");
    await expectText(page, "Upcoming appointments", "rendez-vous anglais");
    await expectText(page, "Invite a contact", "invitation contact anglaise");

    await clickExact(page, "Highlights", "ouvrir Highlights EN");
    await expectText(page, "Highlights", "titre Temps forts anglais");

    await clickExact(page, "Profile", "retour Profile EN");
    const languageChecks = [
      ["Español", "Idioma", "Apariencia"],
      ["Deutsch", "Sprache", "Darstellung"],
      ["Italiano", "Lingua", "Aspetto"],
      ["Português", "Idioma", "Aparência"]
    ];
    let currentA11y = "Change Connexio language";
    for (const [option, languageText, appearanceText] of languageChecks) {
      if (await openLanguagePicker(page, currentA11y)) await chooseLanguage(page, option);
      await expectText(page, languageText, `${option}: langue traduite`);
      await expectText(page, appearanceText, `${option}: apparence traduite`);
      currentA11y = option === "Español" ? "Cambiar idioma de Connexio" : option === "Deutsch" ? "Connexio-Sprache ändern" : option === "Italiano" ? "Cambia lingua di Connexio" : "Alterar idioma do Connexio";
    }

    if (await openLanguagePicker(page, currentA11y)) await chooseLanguage(page, "Français");
    await expectText(page, "Profil", "retour interface française");
    await expectText(page, "Apparence", "retour apparence française");

    if (runtimeErrors.length) failures.push(`erreurs runtime: ${runtimeErrors.slice(0, 5).join(" | ")}`);
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  if (failures.length) {
    console.error("Échecs de l’audit i18n multi-écrans:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log("Audit i18n multi-écrans validé : FR, EN, ES, DE, IT et PT.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
