const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://api.neptunebusiness.com/api"
).replace(/\/$/, "");
const serviceBaseUrl = apiBaseUrl.replace(/\/api$/, "");

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "Accept-Language": "fr-FR" },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    throw new Error(`${url} a répondu HTTP ${response.status}`);
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

async function run() {
  const health = await getJson(`${serviceBaseUrl}/health`);
  if (!health || (health.status !== "ok" && health.ok !== true)) {
    throw new Error("Le healthcheck Neptune n’est pas OK");
  }

  const [members, needs, benefits] = await Promise.all([
    requireArray("/v1/users?limit=1"),
    requireArray("/v1/needs?statut=actif&is_sample=false&limit=1"),
    requireArray("/v1/benefits?active=true&is_sample=false&limit=1")
  ]);

  console.log(
    JSON.stringify(
      {
        backend: apiBaseUrl,
        health: health.status || (health.ok === true ? "ok" : "unknown"),
        routes: {
          members: { status: "ok", sampleCount: members },
          needs: { status: "ok", sampleCount: needs },
          benefits: { status: "ok", sampleCount: benefits }
        }
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(`Smoke backend échoué : ${error.message}`);
  process.exit(1);
});
