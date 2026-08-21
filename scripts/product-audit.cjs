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

async function checkGeometry(page, label) {
  const result = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const rootWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const interactiveSelector = ["button", "a[href]", "input", "textarea", "[role='button']", "[role='tab']", "[role='checkbox']", "[role='radio']", "[role='switch']"].join(",");
    const labelFor = (element) => element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 80) || element.tagName;
    const ownsPoint = (element, x, y) => {
      const top = document.elementFromPoint(x, y);
      return Boolean(top && (top === element || element.contains(top)));
    };
    const reachable = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none" || Number(style.opacity || "1") <= 0.02 || element.closest('[aria-hidden="true"], [inert]') || rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewport.height || rect.right <= 0 || rect.left >= viewport.width) return false;
      const left = Math.max(1, rect.left + 2);
      const right = Math.min(viewport.width - 1, rect.right - 2);
      const top = Math.max(1, rect.top + 2);
      const bottom = Math.min(viewport.height - 1, rect.bottom - 2);
      if (right <= left || bottom <= top) return false;
      return [[(left + right) / 2, (top + bottom) / 2], [left, top], [right, top], [left, bottom], [right, bottom]].some(([x, y]) => ownsPoint(element, x, y));
    };
    const controls = [...document.querySelectorAll(interactiveSelector)].filter(reachable).map((element) => {
      const rect = element.getBoundingClientRect();
      return { label: labelFor(element), left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    });
    return {
      horizontalOverflow: Math.max(rootWidth, bodyWidth) > viewport.width + 1,
      cut: controls.filter((item) => item.left < -1 || item.right > viewport.width + 1),
      undersized: controls.filter((item) => item.width < 43 || item.height < 43)
    };
  });
  if (result.horizontalOverflow) failures.push(`${label}: débordement horizontal`);
  if (result.cut.length) failures.push(`${label}: contrôles coupés horizontalement: ${result.cut.slice(0, 4).map((item) => item.label).join(", ")}`);
  if (result.undersized.length) failures.push(`${label}: cibles sous 44 px: ${result.undersized.slice(0, 5).map((item) => `${item.label} (${Math.round(item.width)}x${Math.round(item.height)})`).join(", ")}`);
}

async function expectVisible(locator, label) {
  try { await locator.waitFor({ state: "visible", timeout: 7000 }); }
  catch { failures.push(`${label}: élément attendu absent`); }
}

async function clickText(page, text, label = text) {
  const candidates = page.getByText(text, { exact: true });
  const count = await candidates.count();
  for (let index = count - 1; index >= 0; index -= 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      return true;
    }
  }
  failures.push(`${label}: élément attendu absent`);
  return false;
}

async function clickVisibleLabel(page, label, auditLabel = label) {
  const candidates = page.getByLabel(label, { exact: true });
  const count = await candidates.count();
  for (let index = count - 1; index >= 0; index -= 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      return true;
    }
  }
  failures.push(`${auditLabel}: élément attendu absent`);
  return false;
}

async function expectAnyVisible(locator, label, timeout = 7000) {
  const deadline = Date.now() + timeout;
  do {
    const count = await locator.count().catch(() => 0);
    for (let index = count - 1; index >= 0; index -= 1) {
      if (await locator.nth(index).isVisible().catch(() => false)) return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (Date.now() < deadline);
  failures.push(`${label}: élément attendu absent`);
  return false;
}

async function pageDiagnostic(page) {
  return page.evaluate(() => ({
    url: window.location.href,
    text: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 500),
    controls: [...document.querySelectorAll("button, [role='button'], a, input")]
      .map((element) => element.getAttribute("aria-label") || element.textContent?.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 30)
  }));
}

async function resetToMessages(page) {
  await page.goto(`http://127.0.0.1:${port}/messages`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(650);
  await expectVisible(page.getByText("Messages", { exact: true }).first(), "retour propre aux Messages");
}

async function checkSignInContrast(page) {
  const result = await page.evaluate(() => {
    const heading = [...document.querySelectorAll("h1,h2,[role='heading'],div")].find((element) => element.textContent?.trim() === "Se connecter avec Neptune");
    if (!heading) return { found: false, contrast: 0 };
    const parse = (value) => {
      const parts = String(value).match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
      return parts.map((channel) => channel / 255);
    };
    const linear = (value) => value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    const luminance = (rgb) => 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
    const style = getComputedStyle(heading);
    let parent = heading.parentElement;
    let background = "rgb(255,255,255)";
    while (parent) {
      const bg = getComputedStyle(parent).backgroundColor;
      if (bg && !bg.endsWith(", 0)") && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") { background = bg; break; }
      parent = parent.parentElement;
    }
    const l1 = luminance(parse(style.color));
    const l2 = luminance(parse(background));
    return { found: true, contrast: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) };
  });
  if (!result.found) failures.push("connexion light: titre Neptune introuvable");
  else if (result.contrast < 4.5) failures.push(`connexion light: contraste titre insuffisant (${result.contrast.toFixed(2)}:1)`);
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
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce", locale: "fr-FR" });
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") pageErrors.push(message.text()); });
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(800);
      await expectVisible(page.getByText("Messages", { exact: true }).first(), `${width}x${height} Messages`);
      await checkGeometry(page, `${width}x${height} Messages`);

      await page.goto(`http://127.0.0.1:${port}/coworking`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(500);
      await expectVisible(page.getByText("Coworking", { exact: true }).first(), `${width}x${height} Coworking`);
      await expectVisible(page.getByLabel("Rejoindre le coworking", { exact: true }), `${width}x${height} entrée Coworking`);
      await checkGeometry(page, `${width}x${height} Coworking observer`);
      if (pageErrors.length) failures.push(`${width}x${height}: erreurs runtime: ${pageErrors.slice(0, 3).join(" | ")}`);
      await page.close();
    }

    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    await clickText(page, "Privées", "onglet Privées");
    await expectVisible(page.getByPlaceholder("Rechercher une conversation…"), "état discussions privées");
    await checkGeometry(page, "Messages privés");
    await clickText(page, "Groupes", "onglet Groupes");

    const conversation = page.getByRole("button").filter({ hasText: /Annonces|Toulouse|Carcassonne/ }).first();
    if (await conversation.isVisible().catch(() => false)) {
      const box = await conversation.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(650);
        await page.mouse.up();
        await expectVisible(page.getByText(/Mettre en sourdine|Réactiver les notifications/).first(), "menu maintien long");
      }
    } else failures.push("maintien long: aucune conversation de groupe visible");

    await resetToMessages(page);
    const newConversationAction = page.getByLabel("Nouvelle conversation", { exact: true }).first();
    await expectVisible(newConversationAction, "action nouvelle conversation déplacée dans Messages");
    if (await newConversationAction.isVisible().catch(() => false)) {
      await newConversationAction.click();
      await expectVisible(page.getByText("Nouvelle conversation", { exact: true }), "écran nouvelle conversation");
      await checkGeometry(page, "Nouvelle conversation");
      const closeCreation = page.getByLabel("Fermer la création");
      if (await closeCreation.isVisible().catch(() => false)) await closeCreation.click();
    }

    // Coworking V24 : Map observer -> interaction spontanée -> présence -> sortie explicite.
    await resetToMessages(page);
    const portal = page.getByRole("button", { name: /Coworking/ }).first();
    await expectVisible(portal, "portail Coworking central");
    if (await portal.isVisible().catch(() => false)) await portal.click();
    await expectVisible(page.getByText("Coworking", { exact: true }).first(), "Map Coworking observer");
    await expectVisible(page.getByText("Le bureau est ouvert", { exact: true }), "état observer Coworking");
    await expectVisible(page.getByLabel("Rejoindre le coworking", { exact: true }), "entrée Coworking disponible");
    await checkGeometry(page, "Coworking observer");

    const participant = page.getByRole("button", { name: /, (Disponible|Focus|En pause|En échange)(, caméra active)?$/ }).first();
    if (await participant.isVisible().catch(() => false)) {
      await participant.click();
      await expectVisible(page.getByText("Dire bonjour", { exact: true }), "action Dire bonjour depuis la Map");
      await expectVisible(page.getByText("Profil", { exact: true }).last(), "profil depuis la Map");
      await checkGeometry(page, "Fiche personne Coworking");
      await page.goto(`http://127.0.0.1:${port}/coworking`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(350);
    } else failures.push("Coworking observer: aucune personne interactive visible");

    if (await clickVisibleLabel(page, "Rejoindre le coworking", "entrée Coworking")) {
      await expectVisible(page.getByLabel("Quitter le coworking", { exact: true }), "présence Coworking active");
      for (const mode of ["Disponible", "Focus", "En pause", "En échange"]) {
        await expectVisible(page.getByRole("button").filter({ hasText: mode }), `mode ${mode} visible`);
      }
      await checkGeometry(page, "Coworking présent");
      if (await clickVisibleLabel(page, "Quitter le coworking", "sortie Coworking disponible")) {
        await expectVisible(page.getByLabel("Rejoindre le coworking", { exact: true }), "sortie Coworking explicite");
      }
    }

    // Repartir d’un état déterministe puis suivre la navigation normale : cela valide aussi que le Coworking n’a pas cassé les autres onglets.
    await resetToMessages(page);
    await clickText(page, "Temps forts", "onglet Temps forts");
    await expectVisible(page.getByText("Feed", { exact: true }), "Feed Temps forts");
    await checkGeometry(page, "Feed Temps forts");
    await clickText(page, "Map", "onglet Map");
    await expectVisible(page.locator("iframe[title='Carte de découverte Neptune']"), "carte découverte personnes/évènements");
    await checkGeometry(page, "Map");
    await clickText(page, "Feed", "retour Feed depuis Map");
    await expectVisible(page.getByText("Feed", { exact: true }), "Feed restauré depuis Map");

    const quickPrompt = page.getByLabel("Écrire une publication rapide", { exact: true });
    await expectVisible(quickPrompt, "création Temps fort dans le Feed");
    if (await quickPrompt.isVisible().catch(() => false)) {
      await quickPrompt.click();
      await expectVisible(page.getByLabel("Publier maintenant", { exact: true }), "composer rapide Temps fort ouvert");
      await checkGeometry(page, "Composer rapide Temps fort");
    }

    await clickText(page, "Appels", "onglet Appels");
    await expectVisible(page.getByText("Récents", { exact: true }), "historique appels");
    await checkGeometry(page, "Appels");
    await clickText(page, "Profil", "onglet Profil");
    await expectVisible(page.getByText("Compte et sécurité", { exact: true }).first(), "profil fonctionnel");
    await checkGeometry(page, "Profil");

    const languageButton = page.getByLabel("Changer la langue de Connexio", { exact: true });
    await expectVisible(languageButton, "sélecteur de langue");
    if (await languageButton.isVisible().catch(() => false)) {
      await languageButton.click();
      const english = page.getByRole("radio").filter({ hasText: "English" }).first();
      if (await english.isVisible().catch(() => false)) {
        await english.click();
        await page.waitForTimeout(650);
        await expectAnyVisible(page.getByText("Profile", { exact: true }), "navigation traduite en anglais");
        await expectAnyVisible(page.getByText("Appearance", { exact: true }), "profil traduit en anglais");
        const reopenLanguage = page.getByLabel("Change Connexio language", { exact: true });
        if (await reopenLanguage.isVisible().catch(() => false)) {
          await reopenLanguage.click();
          const french = page.getByRole("radio").filter({ hasText: "Français" }).first();
          if (await french.isVisible().catch(() => false)) await french.click();
          await page.waitForTimeout(450);
          await expectAnyVisible(page.getByText("Profil", { exact: true }), "retour interface française");
        }
      }
    }

    const signOut = page.getByLabel("Se déconnecter de Connexio");
    await expectVisible(signOut, "bouton de déconnexion");
    if (await signOut.isVisible().catch(() => false)) {
      await signOut.click();
      const demoEntry = page.getByLabel("Entrer dans la démonstration Connexio");
      await expectVisible(demoEntry, "retour à la connexion");
      await expectVisible(page.getByLabel("Changer la langue de Connexio", { exact: true }).last(), "langue disponible avant connexion");
      await expectVisible(page.getByText("Se connecter avec Neptune", { exact: true }).first(), "titre connexion Neptune");
      await checkGeometry(page, "Connexion après déconnexion");
      await checkSignInContrast(page);
      if (await demoEntry.isVisible().catch(() => false)) {
        await demoEntry.click();
        await expectVisible(page.getByText("Messages", { exact: true }).first(), "reconnexion démonstration");
      } else failures.push(`diagnostic après déconnexion: ${JSON.stringify(await pageDiagnostic(page))}`);
    }

    if (runtimeErrors.length) failures.push(`parcours complet: erreurs runtime: ${runtimeErrors.slice(0, 5).join(" | ")}`);
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  if (failures.length) {
    console.error("Échecs du product audit:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log("Product audit Connexio V24 validé : Coworking Map, Messages, Temps forts, Appels, Profil, langues et géométrie responsive.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});