export const MAP_DOCUMENT_ORIGIN = "https://unpkg.com";

export const LEAFLET_STYLESHEETS = [
  '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous" />',
  '<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" integrity="sha384-pmjIAcz2bAn0xukfxADbZIb3t8oRT9Sv0rvO+BR5Csr6Dhqq+nZs59P0pPKQJkEV" crossorigin="anonymous" />',
  '<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" integrity="sha384-wgw+aLYNQ7dlhK47ZPK7FRACiq7ROZwgFNg0m04avm4CaXS+Z9Y7nMu8yNjBKYC+" crossorigin="anonymous" />'
].join("\n");

export const LEAFLET_SCRIPTS = [
  '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script>',
  '<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js" integrity="sha384-eXVCORTRlv4FUUgS/xmOyr66XBVraen8ATNLMESp92FKXLAMiKkerixTiBvXriZr" crossorigin="anonymous"></script>'
].join("\n");

function escapeAttribute(value: string): string {
  return value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character] ?? character);
}

export function leafletSecurityMeta(additionalScriptOrConnectUrls: readonly string[] = []): string {
  const trustedScripts = new Set<string>();
  const trustedConnections = new Set<string>();
  for (const value of additionalScriptOrConnectUrls) {
    try {
      const url = new URL(value);
      if ((url.protocol === "https:" || url.protocol === "wss:") && !url.username && !url.password) {
        const authority = `${url.hostname}${url.port ? `:${url.port}` : ""}`;
        trustedScripts.add(`https://${authority}`);
        trustedConnections.add(`https://${authority}`);
        trustedConnections.add(`wss://${authority}`);
      }
    } catch {
      // Invalid dynamic origins are excluded from the document policy.
    }
  }
  const scriptOrigins = [...trustedScripts].join(" ");
  const connectionOrigins = [...trustedConnections].join(" ");
  const policy = [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${MAP_DOCUMENT_ORIGIN}${scriptOrigins ? ` ${scriptOrigins}` : ""}`,
    `style-src 'unsafe-inline' ${MAP_DOCUMENT_ORIGIN}`,
    `connect-src ${connectionOrigins || "'none'"}`,
    "img-src https: data: blob:",
    "media-src blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'"
  ].join("; ");
  return `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(policy)}" /><meta name="referrer" content="no-referrer" />`;
}
