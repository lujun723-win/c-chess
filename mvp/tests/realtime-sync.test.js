import assert from "assert";
import http from "http";
import { spawn } from "child_process";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(method, port, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const req = http.request(
      {
        method,
        host: "127.0.0.1",
        port,
        path,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode} ${method} ${path}`));
            return;
          }
          try {
            resolve(raw ? JSON.parse(raw) : {});
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function openSse(port, onEvent) {
  const req = http.request(
    {
      method: "GET",
      host: "127.0.0.1",
      port,
      path: "/api/events",
      headers: { accept: "text/event-stream" },
    },
    (res) => {
      let buffer = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        buffer += chunk;
        let splitIndex = buffer.indexOf("\n\n");
        while (splitIndex >= 0) {
          const block = buffer.slice(0, splitIndex);
          buffer = buffer.slice(splitIndex + 2);
          splitIndex = buffer.indexOf("\n\n");
          if (!block) continue;
          const lines = block.split("\n");
          let eventName = "message";
          let dataRaw = "";
          for (const line of lines) {
            if (line.startsWith(":")) continue;
            if (line.startsWith("event:")) eventName = line.slice(6).trim();
            if (line.startsWith("data:")) dataRaw += line.slice(5).trim();
          }
          let data = {};
          if (dataRaw) {
            try {
              data = JSON.parse(dataRaw);
            } catch (_err) {
              data = { raw: dataRaw };
            }
          }
          onEvent(eventName, data);
        }
      });
    },
  );
  req.end();
  return req;
}

async function waitForServer(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const health = await requestJson("GET", port, "/api/health");
      if (health && health.ok) return;
    } catch (_err) {
      // retry
    }
    await sleep(150);
  }
  throw new Error("server start timeout");
}

async function main() {
  const port = 31110 + Math.floor(Math.random() * 300);
  const server = spawn("node", ["server/index.js"], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", MDNS_ALIAS: "" },
    stdio: "ignore",
  });

  try {
    await waitForServer(port, 8000);
    const events = [];
    const sseReq = openSse(port, (name, data) => {
      events.push({ name, data });
    });
    await sleep(250);
    await requestJson("PUT", port, "/api/db", {
      users: [],
      families: [],
      familyMembers: [],
      studyData: [],
      games: [],
      reviews: [],
      battles: [],
    });

    const start = Date.now();
    let gotUpdate = false;
    while (Date.now() - start < 3500) {
      gotUpdate = events.some((x) => x.name === "db-updated");
      if (gotUpdate) break;
      await sleep(80);
    }
    sseReq.destroy();
    assert.ok(gotUpdate, "should receive db-updated event after PUT /api/db");
    console.log("PASS: realtime SSE db-updated broadcast");
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("FAIL: realtime SSE db-updated broadcast");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
