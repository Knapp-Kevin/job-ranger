const assert = require("node:assert/strict");

const {
  AcquisitionNetworkPolicyError,
} = require("../electron-runtime/electron/src/acquisition-network-policy.cjs");
const {
  createPinnedFetch,
} = require("../electron-runtime/electron/src/pinned-fetch.cjs");
const {
  createPinnedProtocolHandler,
} = require("../electron-runtime/electron/src/browser-loader.cjs");

async function run() {
  let resolverCalls = 0;
  const connectionAttempts = [];
  const rebindingResolver = async (hostname) => {
    resolverCalls += 1;
    assert.equal(hostname, "careers.example.com");
    return resolverCalls === 1 ? ["93.184.216.34"] : ["127.0.0.1"];
  };

  const pinned = createPinnedFetch({
    resolveHost: rebindingResolver,
    executeAddressRequest: async (request, address, originalHostname, body) => {
      connectionAttempts.push({
        url: request.url,
        address,
        originalHostname,
        body: body?.toString("utf8") ?? null,
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const response = await pinned("https://careers.example.com/jobs", {
    redirect: "manual",
  });
  assert.equal(response.status, 200);
  assert.equal(resolverCalls, 1, "the transport must not re-resolve after approval");
  assert.deepEqual(connectionAttempts, [
    {
      url: "https://careers.example.com/jobs",
      address: "93.184.216.34",
      originalHostname: "careers.example.com",
      body: null,
    },
  ]);

  let blockedExecutorCalled = false;
  const blocked = createPinnedFetch({
    resolveHost: async () => ["93.184.216.34", "10.0.0.5"],
    executeAddressRequest: async () => {
      blockedExecutorCalled = true;
      return new Response("unexpected");
    },
  });
  await assert.rejects(
    () => blocked("https://mixed.example/jobs", { redirect: "manual" }),
    AcquisitionNetworkPolicyError,
  );
  assert.equal(blockedExecutorCalled, false, "mixed public/private DNS must fail before connection");

  const fallbackAttempts = [];
  const fallback = createPinnedFetch({
    resolveHost: async () => ["93.184.216.34", "1.1.1.1"],
    executeAddressRequest: async (_request, address) => {
      fallbackAttempts.push(address);
      if (address === "93.184.216.34") throw new Error("simulated connect failure");
      return new Response("ok", { status: 200 });
    },
  });
  const fallbackResponse = await fallback("https://fallback.example/jobs", {
    redirect: "manual",
  });
  assert.equal(await fallbackResponse.text(), "ok");
  assert.deepEqual(fallbackAttempts, ["93.184.216.34", "1.1.1.1"]);

  let browserForward = null;
  const browserHandler = createPinnedProtocolHandler(async (input, init) => {
    browserForward = {
      url: String(input),
      method: init?.method,
      redirect: init?.redirect,
      body: init?.body ? Buffer.from(init.body).toString("utf8") : null,
    };
    return new Response("browser-ok", { status: 200 });
  });
  const browserResponse = await browserHandler(
    new Request("https://cdn.example.com/api/jobs", {
      method: "POST",
      body: "role=engineer",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  );
  assert.equal(await browserResponse.text(), "browser-ok");
  assert.deepEqual(browserForward, {
    url: "https://cdn.example.com/api/jobs",
    method: "POST",
    redirect: "manual",
    body: "role=engineer",
  });

  await assert.rejects(
    () => pinned("https://careers.example.com/jobs"),
    /requires redirect: 'manual'/,
  );

  console.log("DNS-pinned acquisition transport tests passed!");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
