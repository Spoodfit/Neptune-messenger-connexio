const { chromium } = require("playwright");

const BASE_URL = process.env.VISUAL_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const cases = [
  { name: "messages-280x568", width: 280, height: 568, route: "/" },
  { name: "messages-320x568", width: 320, height: 568, route: "/" },
  { name: "messages-390x844", width: 390, height: 844, route: "/" },
  { name: "messages-tablet-768x1024", width: 768, height: 1024, route: "/" },
  { name: "messages-landscape-1024x768", width: 1024, height: 768, route: "/" },
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
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: label(element), width: rect.width, height: rect.height };
      });

    const clippedVisibleRect = (element) => {
      const raw = element.getBoundingClientRect();
      let left = Math.max(0, raw.left);
      let right = Math.min(viewportWidth, raw.right);
      let top = Math.max(0, raw.top);
      let bottom = Math.min(viewportHeight, raw.bottom);
      let ancestor = element.parentElement;
      const clips = (value) => ["hidden", "clip", "auto", "scroll"].includes(value);

      while (ancestor && ancestor !== document.body) {
        const style = getComputedStyle(ancestor);
        const ancestorRect = ancestor.getBoundingClientRect();
        if (clips(style.overflowX)) {
          left = Math.max(left, ancestorRect.left);
          right = Math.min(right, ancestorRect.right);
        }
        if (clips(style.overflowY)) {
          top = Math.max(top, ancestorRect.top);
          bottom = Math.min(bottom, ancestorRect.bottom);
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

    const controlRects = controls.map((element) => ({
      element,
      label: label(element),
      rect: clippedVisibleRect(element)
    }));
    const pointInside = (x, y, rect) =>
      x > rect.left + 1 && x < rect.right - 1 && y > rect.top + 1 && y < rect.bottom - 1;
    const controlOverlaps = [];
    for (let index = 0; index < controlRects.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < controlRects.length; nextIndex += 1) {
        const first = controlRects[index];
        const second = controlRects[nextIndex];
        if (
          first.element.contains(second.element) ||
          second.element.contains(first.element)
        ) {
          continue;
        }
        const a = first.rect;
        const b = second.rect;
        const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (overlapWidth <= 1 || overlapHeight <= 1) continue;

        const overlapArea = overlapWidth * overlapHeight;
        const smallerArea = Math.max(1, Math.min(a.width * a.height, b.width * b.height));
        const overlapRatio = overlapArea / smallerArea;
        const aCenter = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
        const bCenter = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        const centerCollision =
          pointInside(aCenter.x, aCenter.y, b) || pointInside(bCenter.x, bCenter.y, a);

        if (overlapRatio >= 0.35 || centerCollision) {
          controlOverlaps.push({
            first: first.label,
            second: second.label,
            overlapRatio: Number(overlapRatio.toFixed(3))
          });
        }
      }
    }

    const textOverflow = allElements
      .filter((element) => {
        if (!element.textContent?.trim()) return false;
        if (element.getAttribute("aria-hidden") === "true") return false;
        if (element.children.length > 0) return false;
        const style = getComputedStyle(element);
        if (style.textOverflow === "ellipsis" || style.overflow === "hidden") {
          return false;
        }
        return element.scrollWidth > element.clientWidth + 1;
      })
      .slice(0, 20)
      .map((element) => ({
        label: label(element),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth
      }));

    return {
      viewportWidth,
      viewportHeight,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
      horizontalClipping,
      smallTargets,
      controlOverlaps,
      textOverflow
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
        await page.getByLabel(testCase.clickLabel).click();
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
    await navigationPage.waitForTimeout(250);
    findings.push({
      name: "direct-chat-back-navigation",
      url: navigationPage.url(),
      passed: new URL(navigationPage.url()).pathname.endsWith("/messages")
    });
    await navigationContext.close();
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(findings, null, 2));
  const failed = findings.some((finding) => {
    if ("passed" in finding) return !finding.passed;
    return (
      finding.metrics.horizontalOverflow ||
      finding.metrics.horizontalClipping.length > 0 ||
      finding.metrics.smallTargets.length > 0 ||
      finding.metrics.controlOverlaps.length > 0 ||
      finding.metrics.textOverflow.length > 0 ||
      finding.consoleErrors.length > 0 ||
      finding.pageErrors.length > 0
    );
  });
  if (failed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
