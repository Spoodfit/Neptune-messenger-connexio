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

    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Temps forts/ }).click();
    await waitRoute(page, "/highlights", "Navigation Temps forts");
    await page.getByRole("tab", { name: /Appels/ }).click();
    await waitRoute(page, "/calls", "Navigation Appels");
    await page.getByRole("tab", { name: /Profil/ }).click();
    await waitRoute(page, "/settings", "Navigation Profil");
    await page.getByRole("tab", { name: /Messages/ }).click();
    await waitRoute(page, "/messages", "Navigation Messages");

    await page.getByLabel("Créer").click();
    check(await page.getByLabel("Nouvelle conversation").last().isVisible(), "Bouton + : action Conversation visible");
    check(await page.getByLabel("Publier un Temps fort").last().isVisible(), "Bouton + : action Temps fort visible");
    await page.getByLabel("Nouvelle conversation").last().click();
    await waitRoute(page, "/new-conversation", "Bouton + : nouvelle conversation");
    check((await page.getByLabel("Retour à l’écran précédent").count()) === 0, "Aucun bouton Retour secondaire en bas");

    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    await page.getByLabel("Créer").click();
    await page.getByLabel("Publier un Temps fort").last().click();
    await waitRoute(page, "/highlights", "Bouton + : retour au Feed Temps forts");
    check(await page.getByLabel("Publier maintenant", { exact: true }).isVisible(), "Bouton + : composer rapide ouvert");

    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    const privateTab = page.getByRole("tab", { name: "Privées" });
    await privateTab.click();
    check(await page.getByText("Discussions privées", { exact: true }).isVisible(), "Onglet Privées actif");
    const groupTab = page.getByRole("tab", { name: "Groupes" });
    await groupTab.click();
    check(await page.getByText("Discussions de groupe", { exact: true }).isVisible(), "Onglet Groupes actif");

    await page.goto(`${BASE_URL}/highlights`, { waitUntil: "networkidle" });
    const mapTab = page.getByRole("tab", { name: "Afficher la carte" });
    await mapTab.click();
    check(await page.locator("iframe[title='Carte de découverte Neptune']").isVisible(), "Onglet Map actif");

    await page.getByLabel("Créer").click();
    await page.getByLabel("Publier un Temps fort").last().click();
    await waitRoute(page, "/highlights", "Map + Temps fort : reste dans Temps forts");
    check(await page.getByRole("tab", { name: "Afficher le Feed", selected: true }).last().isVisible(), "Map + Temps fort : retour automatique au Feed");
    check(await page.getByLabel("Publier maintenant", { exact: true }).isVisible(), "Map + Temps fort : même composer rapide ouvert");

    await page.goto(`${BASE_URL}/highlights`, { waitUntil: "networkidle" });
    const feedTab = page.getByRole("tab", { name: "Afficher le Feed" });
    check(await feedTab.isVisible(), "Onglet Feed visible");
    check(await page.getByLabel("Options de la publication").first().isVisible(), "Onglet Feed actif");

    const postOptions = page.getByLabel("Options de la publication").first();
    check(await postOptions.isVisible(), "Bouton trois points de publication visible");
    await postOptions.click();
    check(await page.getByRole("menu", { name: "Options du Temps fort" }).isVisible(), "Trois points publication fonctionnels");
    await page.getByLabel("Fermer").last().click();

    const profileButton = page.locator('[aria-label^="Ouvrir le profil de "]').first();
    check(await profileButton.isVisible(), "Accès profil depuis un Temps fort visible");
    await profileButton.click();
    check(pathOf(page).includes("/profile/"), "Ouverture du profil membre", `route obtenue: ${pathOf(page)}`);
    check((await page.getByLabel("Retour à l’écran précédent").count()) === 0, "Aucun bouton Retour secondaire sur le profil membre");

    const lightToggle = page.getByLabel("Passer en mode clair").last();
    check(await lightToggle.isVisible(), "Bouton Light/Dark du profil visible");
    await lightToggle.click();
    check(await page.getByLabel("Passer en mode sombre").last().isVisible(), "Bouton Light/Dark du profil fonctionnel");

    const profileMore = page.getByLabel("Plus d’options").last();
    check(await profileMore.isVisible(), "Trois points du profil visibles");
    await profileMore.click();
    check((await page.locator('[role="menu"]').count()) > 0, "Trois points du profil fonctionnels");
    await page.getByLabel("Fermer").last().click();

    const topBack = page.getByLabel("Retour", { exact: true }).last();
    check(await topBack.isVisible(), "Retour haut gauche du profil visible");
    await topBack.click();
    await waitRoute(page, "/highlights", "Retour haut gauche du profil fonctionnel");

    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
    const languageButton = page.getByLabel("Changer la langue de Connexio").last();
    check(await languageButton.isVisible(), "Réglage langue visible");
    await languageButton.click();
    check(await page.getByText("Langue de Connexio", { exact: true }).last().isVisible(), "Sélecteur de langue fonctionnel");
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
  console.log("Interaction audit passed: navigation, +, composer rapide depuis Feed/Map, segmented controls, menus, theme, single top back control and language picker.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
