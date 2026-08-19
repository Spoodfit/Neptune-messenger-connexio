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

async function anyVisible(locator) {
  const count = await locator.count().catch(() => 0);
  for (let index = count - 1; index >= 0; index -= 1) {
    if (await locator.nth(index).isVisible().catch(() => false)) return true;
  }
  return false;
}

async function visibleLocator(locator) {
  const count = await locator.count().catch(() => 0);
  for (let index = count - 1; index >= 0; index -= 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function checkTarget(locator, label, minimum = 48) {
  const target = await visibleLocator(locator);
  if (!target) {
    failures.push(`${label} — cible absente`);
    return;
  }
  const box = await target.boundingBox();
  if (!box) {
    failures.push(`${label} — géométrie indisponible`);
    return;
  }
  check(box.width >= minimum && box.height >= minimum, label, `${Math.round(box.width)}x${Math.round(box.height)} px, minimum ${minimum}`);
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

    await page.addInitScript(() => {
      window.__connexioCoworkingMediaRequests = 0;
      const mediaDevices = navigator.mediaDevices;
      if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") return;
      const original = mediaDevices.getUserMedia.bind(mediaDevices);
      mediaDevices.getUserMedia = (...args) => {
        window.__connexioCoworkingMediaRequests += 1;
        return original(...args);
      };
    });

    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Temps forts/ }).click();
    await waitRoute(page, "/highlights", "Navigation Temps forts");
    await page.getByRole("tab", { name: /Appels/ }).click();
    await waitRoute(page, "/calls", "Navigation Appels");
    await page.getByRole("tab", { name: /Profil/ }).click();
    await waitRoute(page, "/settings", "Navigation Profil");
    await page.getByRole("tab", { name: /Messages/ }).click();
    await waitRoute(page, "/messages", "Navigation Messages");

    // V23 : le + central devient un portail Coworking vivant.
    const coworkingPortal = page.getByRole("button", { name: /Coworking/ }).first();
    await checkTarget(coworkingPortal, "Portail Coworking central");
    await coworkingPortal.click();
    await waitRoute(page, "/coworking", "Portail Coworking : ouverture en un seul tap");
    check(await page.getByText("Hub Neptune", { exact: true }).first().isVisible(), "Coworking : Hub Neptune visible");
    check(await page.getByText("Espaces en cours", { exact: true }).isVisible(), "Coworking : espaces actifs visibles");
    await checkTarget(page.getByLabel("Créer un espace"), "Coworking : création d’espace tactile");
    const observerMediaRequests = await page.evaluate(() => window.__connexioCoworkingMediaRequests ?? 0);
    check(observerMediaRequests === 0, "Coworking : aucune caméra/micro en mode observation", `requêtes média: ${observerMediaRequests}`);

    const enterHub = page.getByLabel("Entrer dans le Hub Neptune", { exact: true });
    await checkTarget(enterHub, "Coworking : seuil d’entrée tactile");
    check(await page.getByText("Micro coupé au départ", { exact: true }).isVisible(), "Coworking : micro coupé annoncé avant entrée");
    await enterHub.click();
    await waitRoute(page, "/coworking/hub", "Coworking : entrée dans le Hub");
    check(await anyVisible(page.getByLabel("Activer le micro", { exact: true })), "Coworking Hub : micro coupé par défaut");
    check(await anyVisible(page.getByLabel("Couper la caméra", { exact: true })), "Coworking Hub : contrôle caméra visible");
    await checkTarget(page.getByLabel("Activer le micro", { exact: true }), "Coworking Hub : contrôle micro tactile");
    await checkTarget(page.getByLabel("Couper la caméra", { exact: true }), "Coworking Hub : contrôle caméra tactile");
    await checkTarget(page.getByLabel("Mode Focus", { exact: true }), "Coworking Hub : mode Focus tactile");
    await checkTarget(page.getByLabel("Mode disponible", { exact: true }), "Coworking Hub : mode disponible tactile");

    const backWithoutLeaving = await visibleLocator(page.getByLabel("Retour au Coworking sans quitter", { exact: true }));
    if (backWithoutLeaving) {
      await checkTarget(page.getByLabel("Retour au Coworking sans quitter", { exact: true }), "Coworking Hub : retour sans quitter tactile");
      await backWithoutLeaving.click();
      await waitRoute(page, "/coworking", "Coworking : retour lobby sans quitter");
      await page.getByText("Touchez pour revenir", { exact: true }).last().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      check(await anyVisible(page.getByText("Touchez pour revenir", { exact: true })), "Coworking : présence conservée après retour au lobby");
      const leaveCoworking = await visibleLocator(page.getByLabel("Quitter le Coworking", { exact: true }));
      if (leaveCoworking) {
        await checkTarget(page.getByLabel("Quitter le Coworking", { exact: true }), "Coworking : sortie explicite tactile");
        await leaveCoworking.click();
        await page.getByLabel("Entrer dans le Hub Neptune", { exact: true }).last().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
        check(await anyVisible(page.getByLabel("Entrer dans le Hub Neptune", { exact: true })), "Coworking : sortie retire la présence locale");
      } else failures.push("Coworking : sortie explicite tactile — cible absente");
    } else failures.push("Coworking Hub : retour sans quitter tactile — cible absente");

    // La création de conversation n’est pas perdue : elle vit maintenant dans Messages.
    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    const newConversationAction = page.getByLabel("Nouvelle conversation", { exact: true }).first();
    await checkTarget(newConversationAction, "Messages : nouvelle conversation tactile");
    await newConversationAction.click();
    await waitRoute(page, "/new-conversation", "Messages : nouvelle conversation en un seul tap");
    check((await page.getByLabel("Retour à l’écran précédent").count()) === 0, "Aucun bouton Retour secondaire en bas");

    await page.goto(`${BASE_URL}/messages`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Privées/ }).click();
    const privateSearch = page.getByPlaceholder("Rechercher une conversation…");
    await privateSearch.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
    check(await privateSearch.isVisible(), "Onglet Privées actif via contenu privé visible");
    await page.getByRole("tab", { name: /Groupes/ }).click();
    const groupSearch = page.getByPlaceholder("Rechercher un club ou un groupe…");
    await groupSearch.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
    check(await groupSearch.isVisible(), "Onglet Groupes actif via contenu groupe visible");
    check((await page.getByText("Clubs", { exact: true }).count()) > 0, "Organisation Clubs visible");

    // Le bouton Envoyer doit être structurel : visible même lorsque le champ est vide.
    await page.goto(`${BASE_URL}/chat/carcassonne`, { waitUntil: "networkidle" });
    const sendMessage = page.getByLabel("Envoyer le message", { exact: true });
    check(await sendMessage.isVisible(), "Chat : bouton Envoyer toujours visible");
    const composer = page.getByLabel("Écrire un message", { exact: true });
    check(await composer.isVisible(), "Chat : champ message visible");
    await composer.fill("Test bouton envoi V23");
    check((await sendMessage.getAttribute("aria-disabled")) !== "true", "Chat : bouton Envoyer activé après saisie");

    // La publication rapide reste directement disponible dans Temps forts, sans + global.
    await page.goto(`${BASE_URL}/highlights`, { waitUntil: "networkidle" });
    const quickPrompt = page.getByLabel("Écrire une publication rapide", { exact: true });
    check(await quickPrompt.isVisible(), "Feed : création de Temps fort visible");
    await quickPrompt.click();
    const quickComposer = page.getByLabel("Publier maintenant", { exact: true });
    await quickComposer.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    check(await quickComposer.isVisible(), "Feed : composer rapide ouvert");
    check(await page.getByText(/Détecté automatiquement/).first().isVisible(), "Feed : détection automatique de catégorie visible");
    check(await page.getByLabel("Classer comme Besoin").isVisible(), "Feed : catégorie modifiable manuellement");

    await page.goto(`${BASE_URL}/highlights`, { waitUntil: "networkidle" });
    const mapTab = page.getByRole("tab", { name: "Afficher la carte" });
    await mapTab.click();
    const discoveryMap = page.locator("iframe[title='Carte de découverte Neptune']");
    check(await discoveryMap.isVisible(), "Onglet Map actif");
    const feedTab = page.getByRole("tab", { name: "Afficher le Feed" });
    await feedTab.click();
    check(!(await discoveryMap.isVisible().catch(() => false)), "Map : retour au Feed fonctionnel");
    check(await page.getByLabel("Écrire une publication rapide", { exact: true }).isVisible(), "Map : création disponible après retour Feed");

    check(await page.getByLabel("Options de la publication").first().isVisible(), "Onglet Feed actif");
    const postOptions = page.getByLabel("Options de la publication").first();
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
  console.log("Interaction audit passed: V23 Coworking portal, observer privacy, Hub join/leave, 48px controls, relocated conversation creation, messaging, feed/map, profile, feedback and language picker.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});