// Denies networking while a provider runs (contract Draft 0.2: an in-process
// adapter needs a network-denied conformance test). This patches Node APIs in
// process; it is sufficient for the synthetic fake. A real in-process adapter
// (Slice B) needs stronger, OS- or process-level isolation.
const dns = require("node:dns");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");

const TARGETS = [
  [net, "connect"],
  [net, "createConnection"],
  [net.Socket.prototype, "connect"],
  [http, "request"],
  [http, "get"],
  [https, "request"],
  [https, "get"],
  [dns, "lookup"],
  [globalThis, "fetch"],
];

async function withNetworkDenied(fn) {
  const attempts = [];
  const originals = TARGETS.map(([owner, key]) => [owner, key, owner[key]]);
  for (const [owner, key] of TARGETS) {
    owner[key] = function denied() {
      attempts.push(key);
      throw new Error("Network access is denied during inference conformance.");
    };
  }
  try {
    const value = await fn();
    return { value, attempts };
  } finally {
    for (const [owner, key, original] of originals) owner[key] = original;
  }
}

module.exports = { withNetworkDenied };
