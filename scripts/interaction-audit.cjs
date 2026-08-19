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
    await page.waitForURL((url) => url.pathname.replace(/\/$/, "").endsWith(suffix), { timeout: 5000 });
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

    // Le + doit rediriger dès le premier tap : aucun second clic n'est émis par l'audit.
    await page.getByLabel("Créer").click();
    check(await page.getByLabel("Nouvelle conversation").last().isVisible(), "Bouton + : action Conversation visible");
    check(await page.getByLabel("Publier un Temps fort").last().isVisible(), "Bouton + : action Temps fort visible");
    await page.getByLabel("Nouvelle conversation").last().click();
    await waitRoute(page, "/new-conversation", "Bouton + : Conversation en un seul clic");
    check((await page.getByLabel("Retour à l’écran précédent").count()) === 0, "Aucun bouton Retour secondaire en bas");

    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    await page.getByLabel("Créer").click();
    await page.getByLabel("Publier un Temps fort").last().click();
    const quickComposerFromMessages = page.getByLabel("Publier maintenant", { exact: true });
    await quickComposerFromMessages.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await waitRoute(page, "/highlights", "Bouton + : Temps fort en un seul clic");
    check(await quickComposerFromMessages.isVisible(), "Bouton + : composer rapide ouvert");

    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    const privateTab = page.getByRole("tab", { name: "Privées" });
    await privateTab.click();
    check(await privateTab.getAttribute("aria-selected") === "true", "Onglet Privées actif");
    check(await page.getByPlaceholder("Rechercher une conversation…").isVisible(), "Recherche discussions privées visible");
    const groupTab = page.getByRole("tab", { name: "Groupes" });
    await groupTab.click();
    check(await groupTab.getAttribute("aria-selected") === "true", "Onglet Groupes actif");
    check(await page.getByPlaceholder("Rechercher un club ou un groupe…").isVisible(), "Recherche groupes visible");
    check((await page.getByText("Clubs", { exact: true }).count()) > 0, "Organisation Clubs visible");

    // Le bouton Envoyer doit être structurel : visible même lorsque le champ est vide.
    await page.goto(`${BASE_URL}/chat/carcassonne`, { waitUntil: "networkidle" });
    const sendMessage = page.getByLabel("Envoyer le message", { exact: true });
    check(await sendMessage.isVisible(), "Chat : bouton Envoyer toujours visible");
    const composer = page.getByLabel("Écrire un message", { exact: true });
    check(await composer.isVisible(), "Chat : champ message visible");
    await composer.fill("Test bouton envoi V22");
    check((await sendMessage.getAttribute("aria-disabled")) !== "true", "Chat : bouton Envoyer activé après saisie");

    await page.goto(`${BASE_URL}/highlights`, { waitUntil: "networkidle" });
    const mapTab = page.getByRole("tab", { name: "Afficher la carte" });
    await mapTab.click();
    const discoveryMap = page.locator("iframe[title='Carte de découverte Neptune']");
    check(await discoveryMap.isVisible(), "Onglet Map actif");

    await page.getByLabel("Créer").click();
    await page.getByLabel("Publier un Temps fort").last().click();
    const quickComposerFromMap = page.getByLabel("Publier maintenant", { exact: true });
    await quickComposerFromMap.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await waitRoute(page, "/highlights", "Map + Temps fort : reste dans Temps forts");
    check(await quickComposerFromMap.isVisible(), "Map + Temps fort : même composer rapide ouvert");
    check(!(await discoveryMap.isVisible().catch(() => false)), "Map + Temps fort : la carte laisse bien place au Feed");

    check(await page.getByText(/Détecté automatiquement/).first().isVisible(), "Feed : détection automatique de catégorie visible");
    check(await page.getByLabel("Classer comme Besoin").isVisible(), "Feed : catégorie modifiable manuellement");

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

    await page.goto(`${BASE_URL}/call-feedback?callId=mock-call&memberName=Johan`, { waitUntil: "networkidle" });
    check(await page.getByText("Comment s’est passé l’échange ?", { exact: true }).isVisible(), "Fin d’appel : écran satisfaction visible");
    check(await page.getByLabel("Envoyer l’avis", { exact: true }).isVisible(), "Fin d’appel : action Envoyer l’avis visible");
    await page.getByLabel("Passer l’avis", { exact: true }).click();
    await waitRoute(page, "/calls", "Fin d’appel : retour vers Appels");

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
  console.log("Interaction audit passed: V22 single-tap +, permanent send button, group organization, category override, post-call feedback, map/feed, profile, theme and language picker.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
