const { chromium } = require("playwright");

const BASE_URL = process.env.VISUAL_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const cases = [
  { name: "messages-280x568", width: 280, height: 568, route: "/" },
  { name: "messages-320x568", width: 320, height: 568, route: "/" },
  { name: "messages-360x800", width: 360, height: 800, route: "/" },
  { name: "messages-390x844", width: 390, height: 844, route: "/" },
  { name: "messages-393x852", width: 393, height: 852, route: "/" },
  { name: "messages-tablet-768x1024", width: 768, height: 1024, route: "/" },
  { name: "messages-landscape-1024x768", width: 1024, height: 768, route: "/" },
  { name: "contacts-360x800", width: 360, height: 800, route: "/contacts" },
  { name: "account-390x844", width: 390, height: 844, route: "/account" },
  { name: "privacy-393x852", width: 393, height: 852, route: "/privacy" },
  { name: "notifications-360x800", width: 360, height: 800, route: "/notification-settings" },
  { name: "blocked-users-390x844", width: 390, height: 844, route: "/blocked-users" },
  { name: "new-highlight-393x852", width: 393, height: 852, route: "/new-highlight" },
  { name: "highlights-feed-280x568", width: 280, height: 568, route: "/highlights" },
  { name: "highlights-map-390x844", width: 390, height: 844, route: "/highlights", clickLabel: "Afficher la carte" },
  { name: "calls-280x568", width: 280, height: 568, route: "/calls" },
  { name: "settings-280x568", width: 280, height: 568, route: "/settings" },
  { name: "settings-zoom140", width: 320, height: 568, route: "/settings", zoom: 1.4 },
  { name: "chat-280x568", width: 280, height: 568, route: "/chat/carcassonne" },
  { name: "chat-short-390x430", width: 390, height: 430, route: "/chat/carcassonne" },
  { name: "readonly-280x568", width: 280, height: 568, route: "/chat/annonces" }
];

async function inspectPage(page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const withinViewport = (rect) =>
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < viewportHeight &&
      rect.right > 0 &&
      rect.left < viewportWidth;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        withinViewport(rect)
      );
    };
    const label = (element) =>
      (element.getAttribute("aria-label") || element.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 100);
    const elementOwnsPoint = (element, x, y) => {
      const top = document.elementFromPoint(x, y);
      return Boolean(top && (top === element || element.contains(top)));
    };
    const reachable = (element) => {
      if (!visible(element)) return false;
      const rect = element.getBoundingClientRect();
      const left = Math.max(1, rect.left + 2);
      const right = Math.min(viewportWidth - 1, rect.right - 2);
      const top = Math.max(1, rect.top + 2);
      const bottom = Math.min(viewportHeight - 1, rect.bottom - 2);
      if (right <= left || bottom <= top) return false;
      const points = [
        [(left + right) / 2, (top + bottom) / 2],
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom]
      ];
      return points.some(([x, y]) => elementOwnsPoint(element, x, y));
    };

    const allElements = Array.from(document.querySelectorAll("body *")).filter(visible);
    const horizontalClipping = allElements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .slice(0, 20)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: label(element), left: rect.left, right: rect.right };
      });

    const controls = Array.from(
      document.querySelectorAll('button, [role="button"], [role="tab"], a, input, textarea')
    ).filter(reachable);
    const smallTargets = controls
      .map((element) => ({ element, rect: element.getBoundingClientRect(), label: label(element) }))
      .filter(({ rect }) => rect.width < 44 || rect.height < 44)
      .slice(0, 20)
      .map(({ label: itemLabel, rect }) => ({ label: itemLabel, width: rect.width, height: rect.height }));

    const controlOverlaps = [];
    for (let index = 0; index < controls.length; index += 1) {
      const a = controls[index];
      const rectA = a.getBoundingClientRect();
      for (let otherIndex = index + 1; otherIndex < controls.length; otherIndex += 1) {
        const b = controls[otherIndex];
        if (a.contains(b) || b.contains(a)) continue;
        const rectB = b.getBoundingClientRect();
        const width = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
        const height = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));
        if (width <= 1 || height <= 1) continue;
        const ratio = (width * height) / Math.max(1, Math.min(rectA.width * rectA.height, rectB.width * rectB.height));
        if (ratio > 0.42) controlOverlaps.push({ a: label(a), b: label(b), ratio });
      }
    }

    const textOverflow = allElements
      .filter((element) => {
        if (!element.textContent?.trim()) return false;
        const style = getComputedStyle(element);
        return element.scrollWidth > element.clientWidth + 2 && style.overflowX !== "auto" && style.overflowX !== "scroll";
      })
      .slice(0, 20)
      .map((element) => label(element));

    const typographyIssues = allElements
      .filter((element) => element.children.length === 0 && element.textContent?.trim())
      .map((element) => {
        const style = getComputedStyle(element);
        return {
          element,
          label: label(element),
          fontSize: Number.parseFloat(style.fontSize),
          lineHeight: Number.parseFloat(style.lineHeight)
        };
      })
      .filter(({ fontSize, lineHeight }) => Number.isFinite(fontSize) && fontSize < 9 || Number.isFinite(lineHeight) && lineHeight < 10)
      .slice(0, 20)
      .map(({ label: itemLabel, fontSize, lineHeight }) => ({ label: itemLabel, fontSize, lineHeight }));

    const controlSpacingIssues = [];
    for (let index = 0; index < controls.length; index += 1) {
      const a = controls[index];
      const rectA = a.getBoundingClientRect();
      for (let otherIndex = index + 1; otherIndex < controls.length; otherIndex += 1) {
        const b = controls[otherIndex];
        if (a.contains(b) || b.contains(a)) continue;
        const rectB = b.getBoundingClientRect();
        const xGap = Math.max(rectB.left - rectA.right, rectA.left - rectB.right, 0);
        const yGap = Math.max(rectB.top - rectA.bottom, rectA.top - rectB.bottom, 0);
        const verticallyAligned = Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top) > 8;
        const horizontallyAligned = Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left) > 8;
        if (verticallyAligned && xGap > 0 && xGap < 2) controlSpacingIssues.push({ a: label(a), b: label(b), gap: xGap });
        if (horizontallyAligned && yGap > 0 && yGap < 2) controlSpacingIssues.push({ a: label(a), b: label(b), gap: yGap });
      }
    }

    return {
      horizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
      horizontalClipping,
      smallTargets,
      controlOverlaps,
      textOverflow,
      typographyIssues,
      controlSpacingIssues
    };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const findings = [];
  try {
    for (const testCase of cases) {
      const context = await browser.newContext({
        viewport: { width: testCase.width, height: testCase.height },
        locale: "fr-FR",
        reducedMotion: "no-preference"
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(String(error)));
      await page.goto(`${BASE_URL}${testCase.route}`, { waitUntil: "networkidle" });
      if (testCase.zoom) {
        await page.evaluate((zoom) => {
          document.documentElement.style.zoom = String(zoom);
        }, testCase.zoom);
      }
      if (testCase.clickLabel) {
        await page.getByLabel(testCase.clickLabel, { exact: true }).click();
        await page.waitForTimeout(350);
      }
      if (testCase.clickText) {
        await page.getByText(testCase.clickText, { exact: true }).click();
        await page.waitForTimeout(350);
      }
      await page.waitForTimeout(200);
      const metrics = await inspectPage(page);
      findings.push({ ...testCase, url: page.url(), metrics, consoleErrors, pageErrors });
      await context.close();
    }

    const interactionContext = await browser.newContext({ viewport: { width: 320, height: 568 } });
    const interactionPage = await interactionContext.newPage();
    await interactionPage.goto(`${BASE_URL}/chat/carcassonne`, { waitUntil: "networkidle" });
    const input = interactionPage.getByLabel("Écrire un message");
    const send = interactionPage.getByLabel("Envoyer le message");
    const uniqueBody = `Audit doublon ${Date.now()}`;
    await input.fill(uniqueBody);
    await send.dblclick({ delay: 20 });
    await interactionPage.waitForTimeout(650);
    const duplicateCount = await interactionPage.getByText(uniqueBody, { exact: true }).count();
    const composerValue = await input.inputValue();
    findings.push({
      name: "send-double-click",
      duplicateCount,
      composerValue,
      passed: duplicateCount === 1 && composerValue === ""
    });
    await interactionContext.close();

    const navigationContext = await browser.newContext({ viewport: { width: 320, height: 568 } });
    const navigationPage = await navigationContext.newPage();
    await navigationPage.goto(`${BASE_URL}/chat/carcassonne`, { waitUntil: "networkidle" });
    await navigationPage.getByLabel("Retour aux discussions").click();
    await navigationPage.waitForTimeout(350);
    findings.push({
      name: "chat-back-navigation",
      url: navigationPage.url(),
      passed: new URL(navigationPage.url()).pathname.endsWith("/messages")
    });
    await navigationContext.close();

    const problematic = findings.filter((finding) => {
      if ("passed" in finding) return !finding.passed;
      return finding.metrics.horizontalOverflow ||
        finding.metrics.horizontalClipping.length > 0 ||
        finding.metrics.smallTargets.length > 0 ||
        finding.metrics.controlOverlaps.length > 0 ||
        finding.metrics.textOverflow.length > 0 ||
        finding.metrics.typographyIssues.length > 0 ||
        finding.metrics.controlSpacingIssues.length > 0 ||
        finding.consoleErrors.length > 0 ||
        finding.pageErrors.length > 0;
    });

    if (problematic.length) {
      console.error(JSON.stringify(problematic, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(`Visual audit passed on ${findings.length} responsive and interaction scenarios.`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
