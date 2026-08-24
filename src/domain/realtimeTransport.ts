export function buildSocketIoWebSocketUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.protocol === "https:") url.protocol = "wss:";
  else if (url.protocol === "http:") url.protocol = "ws:";
  else if (url.protocol !== "wss:" && url.protocol !== "ws:") {
    throw new Error("URL temps réel invalide.");
  }

  if (!url.pathname.includes("socket.io")) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/socket.io/`;
  }
  url.searchParams.set("EIO", "4");
  url.searchParams.set("transport", "websocket");
  url.searchParams.delete("ticket");
  return url.toString();
}
