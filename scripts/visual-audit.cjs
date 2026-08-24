const { chromium } = require("playwright");

const BASE_URL = process.env.VISUAL_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const cases = [
  { name: "messages-280x568", width: 280, height: 568, route: "/messages" },
  { name: "messages-320x568", width: 320, height: 568, route: "/messages" },
  { name: "messages-360x800", width: 360, height: 800, route: "/messages" },
  { name: "messages-390x844", width: 390, height: 844, route: "/messages" },
  { name: "messages-393x852", width: 393, height: 852, route: "/messages" },
  { name: "messages-tablet-768x1024", width: 768, height: 1024, route: "/messages" },
  { name: "messages-landscape-1024x768", width: 1024, height: 768, route: "/messages" },
  { name: "map-280x568", width: 280, height: 568, route: "/coworking" },
  { name: "map-390x844", width: 390, height: 844, route: "/coworking" },
  { name: "map-tablet-768x1024", width: 768, height: 1024, route: "/coworking" },
  { name: "private-video-280x568", width: 280, height: 568, route: "/coworking/visio-business", waitMs: 1200 },
  { name: "private-video-393x852", width: 393, height: 852, route: "/coworking/visio-business", waitMs: 1200 },
  { name: "schedule-call-280x568", width: 280, height: 568, route: "/schedule-call?memberId=user-lea&mode=video" },
  { name: "schedule-call-393x852", width: 393, height: 852, route: "/schedule-call?memberId=user-lea&mode=video" },
  { name: "highlights-feed-280x568", width: 280, height: 568, route: "/highlights" },
  { name: "highlights-feed-393x852", width: 393, height: 852, route: "/highlights" },
  { name: "contacts-360x800", width: 360, height: 800, route: "/contacts" },
  { name: "account-390x844", width: 390, height: 844, route: "/account" },
  { name: "privacy-393x852", width: 393, height: 852, route: "/privacy" },
  { name: "notifications-360x800", width: 360, height: 800, route: "/notification-settings" },
  { name: "blocked-users-390x844", width: 390, height: 844, route: "/blocked-users" },
  { name: "new-highlight-393x852", width: 393, height: 852, route: "/new-highlight" },
  { name: "calls-280x568", width: 280, height: 568, route: "/calls" },
  { name: "settings-280x568", width: 280, height: 568, route: "/settings" },
  { name: "settings-zoom140", width: 320, height: 568, route: "/settings", zoom: 1.4 },
  { name: "chat-280x568", width: 280, height: 568, route: "/chat/carcassonne" },
  { name: "chat-short-390x430", width: 390, height: 430, route: "/chat/carcassonne" },
  { name: "readonly-280x568", width: 280, height: 568, route: "/chat/annonces" }
];

async function inspectPage(page) {
  return page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const interactiveSelector = 'button,[role="button"],[role="tab"],[role="switch"],a[href],input,textarea';
    const clips = (value) => ["hidden", "clip", "auto", "scroll"].includes(value);
    const rectObject = (rect) => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height });
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && style.pointerEvents !== "none" && Number(style.opacity || "1") > 0.02 && rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < viewport.width && rect.bottom > 0 && rect.top < viewport.height && !element.closest('[aria-hidden="true"],[inert]');
    };
    const label = (element) => (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().replace(/\s+/g, " ").slice(0, 100);
    const clippedRect = (element) => {
      const raw = element.getBoundingClientRect();
      let left = Math.max(0, raw.left);
      let right = Math.min(viewport.width, raw.right);
      let top = Math.max(0, raw.top);
      let bottom = Math.min(viewport.height, raw.bottom);
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== document.body) {
        const style = getComputedStyle(ancestor);
        const rect = ancestor.getBoundingClientRect();
        if (clips(style.overflowX)) {
          left = Math.max(left, rect.left);
          right = Math.min(right, rect.right);
        }
        if (clips(style.overflowY)) {
          top = Math.max(top, rect.top);
          bottom = Math.min(bottom, rect.bottom);
        }
        ancestor = ancestor.parentElement;
      }
      return {
        left,
        right,
        top,
        bottom,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top)
      };
    };
    const controls = [...document.querySelectorAll(interactiveSelector)]
      .filter(visible)
      .map((element) => ({
        element,
        label: label(element),
        raw: rectObject(element.getBoundingClientRect()),
        rect: clippedRect(element)
      }))
      .filter(({ rect }) => rect.width > 1 && rect.height > 1);

    const smallTargets = controls
      .filter(({ raw, rect }) => {
        const fullyRendered = Math.abs(raw.width - rect.width) <= 1 && Math.abs(raw.height - rect.height) <= 1;
        const fullyInside = raw.top >= 8 && raw.bottom <= viewport.height - 8 && raw.left >= 0 && raw.right <= viewport.width;
        return fullyRendered && fullyInside && (raw.width < 44 || raw.height < 44);
      })
      .slice(0, 12)
      .map(({ label: itemLabel, raw }) => ({ label: itemLabel, width: raw.width, height: raw.height }));

    const horizontalClipping = controls
      .filter(({ raw, rect }) => {
        const cutByScrollableAncestor = rect.width + 1 < raw.width;
        return !cutByScrollableAncestor && (raw.left < -1 || raw.right > viewport.width + 1);
      })
      .slice(0, 12)
      .map(({ label: itemLabel, raw }) => ({ label: itemLabel, left: raw.left, right: raw.right }));

    const controlOverlaps = [];
    for (let index = 0; index < controls.length; index += 1) {
      const a = controls[index];
      for (let otherIndex = index + 1; otherIndex < controls.length; otherIndex += 1) {
        const b = controls[otherIndex];
        if (a.element.contains(b.element) || b.element.contains(a.element)) continue;
        const width = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
        const height = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
        if (width <= 1 || height <= 1) continue;
        const ratio = (width * height) / Math.max(1, Math.min(a.rect.width * a.rect.height, b.rect.width * b.rect.height));
        if (ratio > 0.42) controlOverlaps.push({ a: a.label, b: b.label, ratio });
      }
    }

    return {
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > viewport.width + 1,
      horizontalClipping,
      smallTargets,
      controlOverlaps: controlOverlaps.slice(0, 12)
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
        colorScheme: "dark",
        reducedMotion: "reduce"
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error" && !/favicon|ERR_BLOCKED_BY_CLIENT/i.test(message.text())) consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(String(error)));
      await page.goto(`${BASE_URL}${testCase.route}`, { waitUntil: "networkidle" });
      if (testCase.waitMs) await page.waitForTimeout(testCase.waitMs);
      if (testCase.zoom) {
        await page.evaluate((zoom) => {
          document.documentElement.style.zoom = String(zoom);
        }, testCase.zoom);
      }
      await page.waitForTimeout(260);
      const metrics = await inspectPage(page);
      findings.push({ ...testCase, url: page.url(), metrics, consoleErrors, pageErrors });
      await context.close();
    }

    const interactionContext = await browser.newContext({ viewport: { width: 320, height: 568 }, locale: "fr-FR" });
    const interactionPage = await interactionContext.newPage();
    await interactionPage.goto(`${BASE_URL}/chat/carcassonne`, { waitUntil: "networkidle" });
    const input = interactionPage.getByLabel("Écrire un message", { exact: true });
    const send = interactionPage.getByLabel("Envoyer le message", { exact: true });
    const uniqueBody = `Audit doublon ${Date.now()}`;
    await input.fill(uniqueBody);
    await send.dblclick({ delay: 20 });
    await interactionPage.waitForTimeout(700);
    const duplicateCount = await interactionPage.locator(`[aria-label*="${uniqueBody}"]`).count();
    const composerValue = await input.inputValue();
    findings.push({ name: "send-double-click", duplicateCount, composerValue, passed: duplicateCount === 1 && composerValue === "" });
    await interactionContext.close();

    const navigationContext = await browser.newContext({ viewport: { width: 320, height: 568 }, locale: "fr-FR" });
    const navigationPage = await navigationContext.newPage();
    await navigationPage.goto(`${BASE_URL}/chat/carcassonne`, { waitUntil: "networkidle" });
    await navigationPage.getByLabel("Retour aux discussions", { exact: true }).click();
    await navigationPage.waitForTimeout(350);
    findings.push({ name: "chat-back-navigation", url: navigationPage.url(), passed: new URL(navigationPage.url()).pathname.endsWith("/messages") });
    await navigationContext.close();

    const problematic = findings.filter((finding) => {
      if ("passed" in finding) return !finding.passed;
      return finding.metrics.horizontalOverflow ||
        finding.metrics.horizontalClipping.length > 0 ||
        finding.metrics.smallTargets.length > 0 ||
        finding.metrics.controlOverlaps.length > 0 ||
        finding.consoleErrors.length > 0 ||
        finding.pageErrors.length > 0;
    });

    if (problematic.length) {
      console.error(JSON.stringify(problematic, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(`Visual audit V25 passed on ${findings.length} responsive and interaction scenarios.`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
