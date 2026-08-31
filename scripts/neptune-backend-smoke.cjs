const { validateConnexioReadiness } = require("./connexio-readiness.cjs");

const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://api.neptunebusiness.com/api"
).replace(/\/$/, "");
const serviceBaseUrl = apiBaseUrl.replace(/\/api$/, "");
const realtimeUrl = (
  process.env.EXPO_PUBLIC_REALTIME_URL || serviceBaseUrl
).replace(/\/$/, "");
const productionMode = process.env.CONNEXIO_SMOKE_MODE === "production";
const expectedEnvironment =
  process.env.CONNEXIO_EXPECTED_ENVIRONMENT || "production";

function requireSecureUrl(label, value, protocols) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} n’est pas une URL valide`);
  }
  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`${label} doit utiliser ${protocols.join(" ou ")}`);
  }
}

async function request(url, options = {}) {
  return fetch(url, {
    ...options,
    redirect: "error",
    headers: {
      Accept: "application/json",
      "Accept-Language": "fr-FR",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(15_000)
  });
}

async function getJson(url) {
  const response = await request(url);
  if (!response.ok) {
    throw new Error(`${url} a répondu HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("json")) {
    throw new Error(`${url} ne renvoie pas du JSON`);
  }
  return response.json();
}

async function requireArray(path) {
  const payload = await getJson(`${apiBaseUrl}${path}`);
  if (!Array.isArray(payload)) {
    throw new Error(`${path} ne renvoie pas un tableau JSON`);
  }
  return payload.length;
}

async function requireProtectedRoute(path, options = {}) {
  const response = await request(`${apiBaseUrl}${path}`, options);
  if (response.ok) {
    throw new Error(`${path} accepte une requête anonyme (HTTP ${response.status})`);
  }
  if ([404, 405, 501].includes(response.status) || response.status >= 500) {
    throw new Error(`${path} n’est pas opérationnelle (HTTP ${response.status})`);
  }
  if (![401, 403, 429].includes(response.status)) {
    throw new Error(
      `${path} ne prouve pas le contrôle d’accès anonyme (HTTP ${response.status}, 401/403 attendu)`
    );
  }
  return response.status;
}

async function validateHealth() {
  const health = await getJson(`${serviceBaseUrl}/health`);
  if (!health || (health.status !== "ok" && health.ok !== true)) {
    throw new Error("Le healthcheck Neptune n’est pas OK");
  }
  return health.status || "ok";
}

async function runCurrentBackendSmoke() {
  const health = await validateHealth();
  const [members, needs, benefits] = await Promise.all([
    requireArray("/v1/users?limit=1"),
    requireArray("/v1/needs?statut=actif&is_sample=false&limit=1"),
    requireArray("/v1/benefits?active=true&is_sample=false&limit=1")
  ]);

  return {
    mode: "neptune-web-v1",
    backend: apiBaseUrl,
    health,
    routes: {
      members: { status: "ok", sampleCount: members },
      needs: { status: "ok", sampleCount: needs },
      benefits: { status: "ok", sampleCount: benefits }
    }
  };
}

async function runProductionSmoke() {
  requireSecureUrl("EXPO_PUBLIC_API_BASE_URL", apiBaseUrl, ["https:"]);
  requireSecureUrl("EXPO_PUBLIC_REALTIME_URL", realtimeUrl, ["https:", "wss:"]);
  const health = await validateHealth();
  const readinessPayload = await getJson(
    `${apiBaseUrl}/v1/connexio/readiness`
  );
  const readiness = validateConnexioReadiness(readinessPayload, {
    expectedEnvironment
  });
  if (!readiness.ok) {
    throw new Error(
      `Le backend refuse la certification Connexio : ${readiness.errors.join(" ; ")}`
    );
  }

  const protectedRoutes = {
    session: await requireProtectedRoute("/v1/auth/me"),
    conversations: await requireProtectedRoute("/v1/conversations"),
    realtimeTicket: await requireProtectedRoute("/v1/realtime/ticket", {
      method: "POST",
      body: "{}"
    }),
    coworking: await requireProtectedRoute("/v1/coworking"),
    pushTokens: await requireProtectedRoute("/v1/devices/push-tokens", {
      method: "POST",
      body: "{}"
    })
  };

  return {
    mode: "connexio-v1-production",
    backend: apiBaseUrl,
    realtime: realtimeUrl,
    health,
    readiness,
    anonymousAccessRejected: protectedRoutes
  };
}

async function run() {
  const result = productionMode
    ? await runProductionSmoke()
    : await runCurrentBackendSmoke();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`Smoke backend échoué : ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  requireSecureUrl,
  requireProtectedRoute,
  request,
  runCurrentBackendSmoke,
  runProductionSmoke
};
