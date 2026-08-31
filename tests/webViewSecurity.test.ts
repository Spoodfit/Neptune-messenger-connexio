import { strictEqual, throws } from "node:assert";
import { test } from "node:test";

import {
  allowsAttachmentNavigation,
  allowsWebViewNavigation,
  attachmentWebViewPolicy,
  browserOriginForTransport,
  mediaWebViewOrigins
} from "../src/domain/webViewSecurity";

test("convertit WSS vers l’origine navigateur HTTPS correspondante", () => {
  strictEqual(browserOriginForTransport("wss://api.example.com/realtime"), "https://api.example.com");
  strictEqual(browserOriginForTransport("https://cdn.example.com/client.js"), "https://cdn.example.com");
});

test("limite un aperçu de pièce jointe à sa ressource ou à son origine HTTPS", () => {
  strictEqual(attachmentWebViewPolicy("http://files.example.com/report.pdf"), null);
  strictEqual(attachmentWebViewPolicy("https://user:secret@files.example.com/report.pdf"), null);
  strictEqual(attachmentWebViewPolicy("file:///tmp/report.pdf")?.allowFileAccess, true);
  strictEqual(
    attachmentWebViewPolicy("https://files.example.com/report.pdf")?.originWhitelist[0],
    "https://files.example.com"
  );
  strictEqual(
    allowsAttachmentNavigation(
      "https://files.example.com/report.pdf",
      "https://files.example.com/redirected.pdf"
    ),
    true
  );
  strictEqual(
    allowsAttachmentNavigation(
      "https://files.example.com/report.pdf",
      "https://attacker.example/report.pdf"
    ),
    false
  );
  strictEqual(
    allowsAttachmentNavigation("file:///tmp/report.pdf", "file:///tmp/another.pdf"),
    false
  );
});

test("refuse les origines WebView non chiffrées hors développement local", () => {
  throws(() => browserOriginForTransport("http://evil.example/client.js"));
  strictEqual(browserOriginForTransport("http://localhost:8081/client.js"), "http://localhost:8081");
});

test("bloque toute navigation hors des origines strictement nécessaires", () => {
  const origins = mediaWebViewOrigins("wss://api.example.com/realtime", "https://cdn.example.com/client.js");
  strictEqual(allowsWebViewNavigation("about:blank", origins), true);
  strictEqual(allowsWebViewNavigation("https://api.example.com/call", origins), true);
  strictEqual(allowsWebViewNavigation("https://cdn.example.com/client.js", origins), true);
  strictEqual(allowsWebViewNavigation("https://user:secret@api.example.com/call", origins), false);
  strictEqual(allowsWebViewNavigation("https://attacker.example/phish", origins), false);
  strictEqual(allowsWebViewNavigation("file:///tmp/token.html", origins), false);
});
