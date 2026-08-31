const playwright = require("playwright");

const originalLaunch = playwright.chromium.launch.bind(playwright.chromium);

playwright.chromium.launch = async (...args) => {
  const browser = await originalLaunch(...args);
  const originalNewContext = browser.newContext.bind(browser);
  browser.newContext = (options = {}) => originalNewContext({ locale: "fr-FR", ...options });
  return browser;
};

require("./visual-audit.cjs");
