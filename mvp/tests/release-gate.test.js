import assert from "assert";
import http from "http";
import { spawn } from "child_process";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestRaw(method, port, path, body = "", headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === "string" ? body : JSON.stringify(body || {});
    const req = http.request(
      {
        method,
        host: "127.0.0.1",
        port,
        path,
        headers: {
          accept: "application/json",
          ...headers,
          ...(method === "PUT" || method === "POST"
            ? { "content-length": Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch (_err) {
            json = null;
          }
          resolve({ status: res.statusCode || 0, raw, json });
        });
      },
    );
    req.on("error", reject);
    if (method === "PUT" || method === "POST") req.write(payload);
    req.end();
  });
}

async function waitForServer(port, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await requestRaw("GET", port, "/api/health");
      if (res.status === 200 && res.json && res.json.ok === true) return;
    } catch (_err) {
      // retry
    }
    await sleep(140);
  }
  throw new Error("server start timeout");
}

function assertDbShape(db) {
  const keys = ["users", "families", "familyMembers", "studyData", "games", "reviews", "battles"];
  for (const key of keys) {
    assert.ok(db && Array.isArray(db[key]), `db.${key} should be array`);
  }
}

async function main() {
  const port = Number(process.env.TEST_PORT || 3001);
  let server = null;
  let useExistingServer = false;
  try {
    const health = await requestRaw("GET", port, "/api/health");
    useExistingServer = health.status === 200 && health.json && health.json.ok === true;
  } catch (_err) {
    useExistingServer = false;
  }
  if (!useExistingServer) {
    server = spawn("node", ["server/index.js"], {
      env: {
        ...process.env,
        PORT: String(port),
        HOST: "127.0.0.1",
        MDNS_ALIAS: "",
        DB_WRITE_RATE_LIMIT_WINDOW_MS: "10000",
        DB_WRITE_RATE_LIMIT_MAX: "4",
      },
      stdio: "ignore",
    });
  }

  try {
    await waitForServer(port, 8000);

    const health = await requestRaw("GET", port, "/api/health");
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.json && health.json.ok, true);

    const access = await requestRaw("GET", port, "/api/access");
    assert.strictEqual(access.status, 200);
    assert.ok(access.json && Array.isArray(access.json.links));
    assert.ok(access.json.links.length > 0);

    const dbRes = await requestRaw("GET", port, "/api/db");
    assert.strictEqual(dbRes.status, 200);
    assertDbShape(dbRes.json);

    const payload = {
      users: [{ id: "u_test", name: "tester", email: "t@example.com", passwordHash: "x" }],
      families: [],
      familyMembers: [],
      studyData: [],
      games: [],
      reviews: [],
      battles: [],
    };
    const putOk = await requestRaw("PUT", port, "/api/db", payload, {
      "content-type": "application/json",
    });
    assert.strictEqual(putOk.status, 200);
    assertDbShape(putOk.json);
    assert.strictEqual(putOk.json.users[0].id, "u_test");

    const putBadJson = await requestRaw("PUT", port, "/api/db", "{bad json", {
      "content-type": "application/json",
    });
    assert.strictEqual(putBadJson.status, 400);
    assert.ok(/JSON/.test((putBadJson.json && putBadJson.json.error) || ""));

    if (!useExistingServer) {
      const limitBody = {
        users: [],
        families: [],
        familyMembers: [],
        studyData: [],
        games: [],
        reviews: [],
        battles: [],
      };
      // Remaining budget is 3 writes in this window (max=4, one write already consumed).
      const limitRes1 = await requestRaw("PUT", port, "/api/db", limitBody, {
        "content-type": "application/json",
      });
      const limitRes2 = await requestRaw("PUT", port, "/api/db", limitBody, {
        "content-type": "application/json",
      });
      const limitRes3 = await requestRaw("PUT", port, "/api/db", limitBody, {
        "content-type": "application/json",
      });
      const limitRes4 = await requestRaw("PUT", port, "/api/db", limitBody, {
        "content-type": "application/json",
      });
      assert.strictEqual(limitRes1.status, 200);
      assert.strictEqual(limitRes2.status, 200);
      assert.strictEqual(limitRes3.status, 200);
      assert.strictEqual(limitRes4.status, 429);
    } else {
      console.log("SKIP: rate-limit assertion (using existing server instance)");
    }

    console.log("PASS: release gate (health/access/db/rate-limit)");
  } finally {
    if (server) server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("FAIL: release gate test");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
