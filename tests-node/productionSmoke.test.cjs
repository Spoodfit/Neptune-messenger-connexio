const assert = require("node:assert/strict");
const test = require("node:test");

const {
  request,
  requireProtectedRoute
} = require("../scripts/neptune-backend-smoke.cjs");

async function withFetch(responseFactory, action) {
  const previousFetch = global.fetch;
  global.fetch = responseFactory;
  try {
    return await action();
  } finally {
    global.fetch = previousFetch;
  }
}

test("le smoke production exige une preuve d’authentification 401/403", async () => {
  await withFetch(
    async () => new Response(null, { status: 401 }),
    async () => {
      assert.equal(await requireProtectedRoute("/v1/auth/me"), 401);
    }
  );

  await withFetch(
    async () => new Response(null, { status: 403 }),
    async () => {
      assert.equal(await requireProtectedRoute("/v1/auth/me"), 403);
    }
  );
});

test("une validation 400 ne prouve pas que la route est protégée", async () => {
  await withFetch(
    async () => new Response(null, { status: 400 }),
    async () => {
      await assert.rejects(
        requireProtectedRoute("/v1/realtime/ticket", {
          method: "POST",
          body: "{}"
        }),
        /ne prouve pas le contrôle d’accès anonyme/
      );
    }
  );
});

test("le smoke refuse toujours les redirections HTTP", async () => {
  await withFetch(
    async (_url, options) => {
      assert.equal(options.redirect, "error");
      return new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    },
    async () => {
      await request("https://api.example.invalid/health", {
        redirect: "follow"
      });
    }
  );
});
