const { chromium } = require("playwright");

const BASE_URL = process.env.VISUAL_AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const cases = [
  { name: "messages-280x568", width: 280, height: 568, route: "/" },
  { name: "messages-320x568", width: 320, height: 568, route: "/" },
  { name: "messages-390x844", width: 390, height: 844, route: "/" },
  { name: "messages-tablet-768x1024", width: 768, height: 1024, route: "/" },
  { name: "messages-landscape-1024x768", width: 1024, height: 768, route: "/" },
  { name: "communities-280x568", width: 280, height: 568, route: "/communities" },
  { name: "contacts-280x568", width: 280, height: 568, route: "/contacts" },
  { name: "settings-280x568", width: 280, height: 568, route: "/settings" },
  { name: "settings-zoom140", width: 320, height: 568, route: "/settings", zoom: 1.4 },
  { name: "chat-280x568", width: 280, height: 568, route: "/chat/carcassonne" },
  { name: "chat-short-390x430", width: 390, height: 430, route: "/chat/carcassonne" },
  { name: "readonly-280x568", width: 280, height: 568, route: "/chat/annonces" }
];

function overlaps(first, second) {
  return (
    first.left < second.right - 1 &&
    first.right > second.left + 1 &&
    first.top < second.bottom - 1 &&
    first.bottom > second.top + 1
  );
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const label = (element) =>
      (element.getAttribute("aria-label") || element.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 100);

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
      document.querySelectorAll('button, [role="button"], a, input, textarea')
    ).filter(visible);
    const smallTargets = controls
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: label(element), width: rect.width, height: rect.height };
      });

    const controlRects = controls.map((element) => ({
      element,
      label: label(element),
      rect: element.getBoundingClientRect()
    }));
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
        if (
          a.left < b.right - 1 &&
          a.right > b.left + 1 &&
          a.top < b.bottom - 1 &&
          a.bottom > b.top + 1
        ) {
          controlOverlaps.push({ first: first.label, second: second.label });
        }
      }
    }

    const textOverflow = allElements
      .filter((element) => {
        if (!element.textContent?.trim()) return false;
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

    const fixedElements = allElements
      .filter((element) => {
        const position = getComputedStyle(element).position;
        return position === "fixed" || position === "sticky";
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: label(element),
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right
        };
      });

    return {
      viewportWidth,
      viewportHeight,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
      horizontalClipping,
      smallTargets,
      controlOverlaps,
      textOverflow,
      fixedElements
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
      await page.goto(`${BASE_URL}${testCase.route}`, {
        waitUntil: "networkidle",
        timeout: 30_000
      });
      await page.waitForTimeout(400);
      if (testCase.zoom) {
        await page.evaluate((zoom) => {
          document.body.style.zoom = String(zoom);
        }, testCase.zoom);
        await page.waitForTimeout(200);
      }
      const metrics = await inspectPage(page);
      findings.push({ ...testCase, url: page.url(), metrics, consoleErrors, pageErrors });
      await context.close();
    }

    const interactionContext = await browser.newContext({
      viewport: { width: 320, height: 568 },
      locale: "fr-FR"
    });
    const interactionPage = await interactionContext.newPage();
    await interactionPage.goto(`${BASE_URL}/chat/carcassonne`, {
      waitUntil: "networkidle",
      timeout: 30_000
    });
    const input = interactionPage.getByLabel("Écrire un message");
    const sendButton = interactionPage.getByLabel("Envoyer le message");
    const uniqueText = `Audit double envoi ${Date.now()}`;
    await input.fill(uniqueText);
    await sendButton.dblclick({ delay: 30 });
    await interactionPage.waitForTimeout(900);
    const duplicateCount = await interactionPage.getByText(uniqueText, { exact: true }).count();
    const composerValue = await input.inputValue();
    findings.push({
      name: "send-double-click",
      duplicateCount,
      composerValue,
      passed: duplicateCount === 1 && composerValue === ""
    });

    await interactionPage.goto(`${BASE_URL}/chat/carcassonne`, {
      waitUntil: "networkidle",
      timeout: 30_000
    });
    await interactionPage.getByLabel("Retour aux discussions").click();
    await interactionPage.waitForTimeout(300);
    findings.push({
      name: "direct-chat-back-navigation",
      url: interactionPage.url(),
      passed: /\/messages(?:$|[?#])/.test(interactionPage.url()) || interactionPage.url().endsWith("/")
    });
    await interactionContext.close();
  } finally {
    await browser.close();
  }

  const failures = findings.filter((finding) => {
    if (typeof finding.passed === "boolean") return !finding.passed;
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
  console.log(JSON.stringify(findings, null, 2));
  if (failures.length > 0) {
    console.error("VISUAL_AUDIT_FAILURES");
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
