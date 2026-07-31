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
  response.writeHead(200, {
    "Content-Type": mime(file),
    "Cache-Control": "no-store"
  });
  fs.createReadStream(file).pipe(response);
});

function browserExecutable() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome"
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function checkGeometry(page, label) {
  const result = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const rootWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const interactiveSelector = [
      "button",
      "a[href]",
      "input",
      "textarea",
      "[role='button']",
      "[role='tab']",
      "[role='checkbox']",
      "[role='radio']",
      "[role='switch']"
    ].join(",");
    const visible = [...document.querySelectorAll(interactiveSelector)]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity || "1") > 0.02 &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < viewport.height &&
          rect.right > 0 &&
          rect.left < viewport.width
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label:
            element.getAttribute("aria-label") ||
            element.textContent?.trim().slice(0, 80) ||
            element.tagName,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        };
      });
    return {
      horizontalOverflow: Math.max(rootWidth, bodyWidth) > viewport.width + 1,
      cut: visible.filter(
        (item) =>
          item.left < -1 ||
          item.right > viewport.width + 1 ||
          item.top < -1 ||
          item.bottom > viewport.height + 1
      ),
      undersized: visible.filter(
        (item) => item.width < 43 || item.height < 43
      )
    };
  });
  if (result.horizontalOverflow) failures.push(`${label}: débordement horizontal`);
  if (result.cut.length) {
    failures.push(
      `${label}: contrôles coupés: ${result.cut
        .slice(0, 4)
        .map((item) => item.label)
        .join(", ")}`
    );
  }
  if (result.undersized.length) {
    failures.push(
      `${label}: cibles sous 44 px: ${result.undersized
        .slice(0, 5)
        .map((item) => `${item.label} (${Math.round(item.width)}x${Math.round(item.height)})`)
        .join(", ")}`
    );
  }
}

async function expectVisible(locator, label) {
  try {
    await locator.waitFor({ state: "visible", timeout: 7000 });
  } catch {
    failures.push(`${label}: élément attendu absent`);
  }
}

async function clickText(page, text, label = text) {
  const locator = page.getByText(text, { exact: true }).first();
  await expectVisible(locator, label);
  if (await locator.isVisible().catch(() => false)) await locator.click();
}

async function run() {
  if (!fs.existsSync(path.join(root, "index.html"))) {
    throw new Error("Le build web-product-audit-dist est absent.");
  }
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error("Chromium est introuvable.");

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  try {
    const sizes = [
      [280, 568],
      [320, 568],
      [390, 844],
      [430, 720],
      [768, 1024],
      [1024, 768]
    ];
    for (const [width, height] of sizes) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: "reduce"
      });
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") pageErrors.push(message.text());
      });
      await page.goto(`http://127.0.0.1:${port}/`, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      await page.waitForTimeout(800);
      await expectVisible(page.getByText("Messages", { exact: true }).first(), `${width}x${height} Messages`);
      await checkGeometry(page, `${width}x${height} Messages`);
      if (pageErrors.length) {
        failures.push(`${width}x${height}: erreurs runtime: ${pageErrors.slice(0, 3).join(" | ")}`);
      }
      await page.close();
    }

    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    await clickText(page, "Privées", "onglet Privées");
    await expectVisible(page.getByText("Discussions privées", { exact: true }), "titre discussions privées");
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
        const closeOptions = page.getByLabel("Fermer les options de conversation");
        await expectVisible(closeOptions, "fermeture du menu de conversation");
        if (await closeOptions.isVisible().catch(() => false)) {
          await closeOptions.click();
          await page.waitForTimeout(180);
        }
      }
    } else {
      failures.push("maintien long: aucune conversation de groupe visible");
    }

    const createConversation = page.getByLabel("Créer une nouvelle conversation");
    await expectVisible(createConversation, "bouton nouvelle conversation");
    if (await createConversation.isVisible().catch(() => false)) {
      await createConversation.click();
      await expectVisible(page.getByText("Nouvelle conversation", { exact: true }), "écran nouvelle conversation");
      await checkGeometry(page, "Nouvelle conversation");
      await page.getByLabel("Fermer la création").click();
    }

    await clickText(page, "Temps forts", "onglet Temps forts");
    await expectVisible(page.getByText("Feed", { exact: true }), "Feed Temps forts");
    await checkGeometry(page, "Feed Temps forts");
    await clickText(page, "Map", "onglet Map");
    await expectVisible(page.locator("iframe[title='Carte Neptune']"), "carte Leaflet");
    await checkGeometry(page, "Map");
    const createHighlight = page.getByLabel("Publier un Temps fort");
    if (await createHighlight.isVisible().catch(() => false)) {
      await createHighlight.click();
      await expectVisible(page.getByText("Nouveau Temps fort", { exact: true }), "création Temps fort");
      await checkGeometry(page, "Nouveau Temps fort");
      await page.getByLabel("Fermer").click();
    }

    await clickText(page, "Appels", "onglet Appels");
    await expectVisible(page.getByText("Récents", { exact: true }), "historique appels");
    await checkGeometry(page, "Appels");

    await clickText(page, "Profil", "onglet Profil");
    await expectVisible(page.getByText("Compte et sécurité", { exact: true }).first(), "profil fonctionnel");
    await checkGeometry(page, "Profil");

    const signOut = page.getByLabel("Se déconnecter de Connexio");
    await expectVisible(signOut, "bouton de déconnexion");
    if (await signOut.isVisible().catch(() => false)) {
      await signOut.click();
      await expectVisible(page.getByText("Entrer en démonstration", { exact: true }), "retour à la connexion");
      await checkGeometry(page, "Connexion après déconnexion");
      await page.getByText("Entrer en démonstration", { exact: true }).click();
      await expectVisible(page.getByText("Messages", { exact: true }).first(), "reconnexion démonstration");
    }

    if (runtimeErrors.length) {
      failures.push(`parcours complet: erreurs runtime: ${runtimeErrors.slice(0, 5).join(" | ")}`);
    }
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
  console.log("Product audit Connexio validé.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
