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
    await page.waitForURL((url) => url.pathname.replace(/\/$/, "").endsWith(suffix), { timeout: 3000 });
  } catch {}
  check(pathOf(page).endsWith(suffix), label, `route obtenue: ${pathOf(page)}`);
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
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    // Bottom navigation must respond to every tab without a global gesture layer stealing taps.
    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Temps forts/ }).click();
    await waitRoute(page, "/highlights", "Navigation Temps forts");
    await page.getByRole("tab", { name: /Appels/ }).click();
    await waitRoute(page, "/calls", "Navigation Appels");
    await page.getByRole("tab", { name: /Profil/ }).click();
    await waitRoute(page, "/settings", "Navigation Profil");
    await page.getByRole("tab", { name: /Messages/ }).click();
    await waitRoute(page, "/messages", "Navigation Messages");

    // The central plus must open its own quick-action layer and both destinations must be clickable.
    await page.getByLabel("Créer").click();
    check(await page.getByLabel("Nouvelle conversation").isVisible(), "Bouton + : action Conversation visible");
    check(await page.getByLabel("Publier un Temps fort").isVisible(), "Bouton + : action Temps fort visible");
    await page.getByLabel("Nouvelle conversation").click();
    await waitRoute(page, "/new-conversation", "Bouton + : nouvelle conversation");
    check(await page.getByLabel("Retour à l’écran précédent").isVisible(), "Retour secondaire présent sur un écran de détail");

    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    await page.getByLabel("Créer").click();
    await page.getByLabel("Publier un Temps fort").click();
    await waitRoute(page, "/new-highlight", "Bouton + : nouveau Temps fort");

    // Segmented controls must stay interactive after the swipe-navigation removal.
    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    const privateTab = page.getByRole("tab", { name: "Privées" });
    await privateTab.click();
    check((await privateTab.getAttribute("aria-selected")) === "true", "Onglet Privées actif");
    const groupTab = page.getByRole("tab", { name: "Groupes" });
    await groupTab.click();
    check((await groupTab.getAttribute("aria-selected")) === "true", "Onglet Groupes actif");

    await page.goto(`${BASE_URL}/highlights`, { waitUntil: "networkidle" });
    const mapTab = page.getByRole("tab", { name: "Map" });
    await mapTab.click();
    check((await mapTab.getAttribute("aria-selected")) === "true", "Onglet Map actif");
    const feedTab = page.getByRole("tab", { name: "Feed" });
    await feedTab.click();
    check((await feedTab.getAttribute("aria-selected")) === "true", "Onglet Feed actif");

    // Publication ellipsis must open the Connexio action sheet.
    const postOptions = page.getByLabel("Options de la publication").first();
    check(await postOptions.isVisible(), "Bouton trois points de publication visible");
    await postOptions.click();
    check(await page.getByRole("menu", { name: "Options du Temps fort" }).isVisible(), "Menu trois points de publication fonctionnel");
    await page.getByLabel("Fermer").last().click();

    // Open a real mock member profile from the feed, then exercise all top-bar actions.
    const profileButton = page.locator('[aria-label^="Ouvrir le profil de "]').first();
    check(await profileButton.isVisible(), "Accès profil depuis un Temps fort visible");
    await profileButton.click();
    check(pathOf(page).includes("/profile/"), "Ouverture du profil membre", `route obtenue: ${pathOf(page)}`);
    check(await page.getByLabel("Retour à l’écran précédent").isVisible(), "Retour secondaire présent sur le profil membre");

    const lightToggle = page.getByLabel("Passer en mode clair");
    check(await lightToggle.isVisible(), "Bouton Light/Dark du profil visible");
    await lightToggle.click();
    check(await page.getByLabel("Passer en mode sombre").isVisible(), "Bouton Light/Dark du profil fonctionnel");

    const profileMore = page.getByLabel("Plus d’options");
    check(await profileMore.isVisible(), "Trois points du profil visibles");
    await profileMore.click();
    check((await page.locator('[role="menu"]').count()) > 0, "Trois points du profil fonctionnels");
    await page.getByLabel("Fermer").last().click();

    const topBack = page.getByLabel("Retour", { exact: true });
    check(await topBack.isVisible(), "Retour haut gauche du profil visible");
    await topBack.click();
    await waitRoute(page, "/highlights", "Retour haut gauche du profil fonctionnel");

    // App language selector must be discoverable and use Connexio UI rather than an OS dialog.
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
    const languageButton = page.getByLabel("Changer la langue de Connexio");
    check(await languageButton.isVisible(), "Réglage langue visible");
    await languageButton.click();
    check(await page.getByText("Langue de Connexio", { exact: true }).isVisible(), "Sélecteur de langue fonctionnel");
    await page.getByLabel("Fermer").last().click();

    check(pageErrors.length === 0, "Aucune erreur JavaScript pendant les interactions", pageErrors.join(" | "));
    await context.close();
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error("Interaction audit failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("Interaction audit passed: navigation, +, segmented controls, menus, theme, back controls and language picker.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
