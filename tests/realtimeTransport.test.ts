import { doesNotMatch, match, strictEqual, throws } from "node:assert";
import test from "node:test";

import { buildSocketIoWebSocketUrl } from "../src/domain/realtimeTransport";

test("construit le transport Socket.IO sans exposer le ticket dans l’URL", () => {
  const url = buildSocketIoWebSocketUrl(
    "https://api.neptunebusiness.com?ticket=secret-a-ne-jamais-journaliser"
  );

  match(url, /^wss:\/\/api\.neptunebusiness\.com\/socket\.io\//);
  match(url, /EIO=4/);
  match(url, /transport=websocket/);
  doesNotMatch(url, /ticket=/);
  doesNotMatch(url, /secret-a-ne-jamais-journaliser/);
});

test("préserve un chemin Socket.IO explicite et refuse un protocole inconnu", () => {
  strictEqual(
    buildSocketIoWebSocketUrl("wss://api.example.com/custom/socket.io/"),
    "wss://api.example.com/custom/socket.io/?EIO=4&transport=websocket"
  );
  throws(() => buildSocketIoWebSocketUrl("ftp://api.example.com"));
});
