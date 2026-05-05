import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";
const MDNS_ALIAS = (process.env.MDNS_ALIAS || "chess.local").trim().toLowerCase();
const DB_WRITE_RATE_LIMIT_WINDOW_MS = Number(process.env.DB_WRITE_RATE_LIMIT_WINDOW_MS || 5000);
const DB_WRITE_RATE_LIMIT_MAX = Number(process.env.DB_WRITE_RATE_LIMIT_MAX || 80);
let dbVersion = 0;
const sseClients = new Set();
const dbWriteRateBucket = new Map();
let dbWriteQueue = Promise.resolve();

function defaultDb() {
  return {
    users: [],
    families: [],
    familyMembers: [],
    studyData: [],
    games: [],
    reviews: [],
    battles: [],
  };
}

function ensureDbShape(db) {
  const base = defaultDb();
  const merged = { ...base, ...(db || {}) };
  if (!Array.isArray(merged.users)) merged.users = [];
  if (!Array.isArray(merged.families)) merged.families = [];
  if (!Array.isArray(merged.familyMembers)) merged.familyMembers = [];
  if (!Array.isArray(merged.studyData)) merged.studyData = [];
  if (!Array.isArray(merged.games)) merged.games = [];
  if (!Array.isArray(merged.reviews)) merged.reviews = [];
  if (!Array.isArray(merged.battles)) merged.battles = [];
  return merged;
}

async function ensureDbFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch (_err) {
    await fs.writeFile(DB_PATH, `${JSON.stringify(defaultDb(), null, 2)}\n`, "utf-8");
  }
}

async function readDb() {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  try {
    return ensureDbShape(JSON.parse(raw));
  } catch (_err) {
    const fresh = defaultDb();
    await writeDb(fresh);
    return fresh;
  }
}

async function writeDb(db) {
  const stable = ensureDbShape(db);
  await fs.writeFile(DB_PATH, `${JSON.stringify(stable, null, 2)}\n`, "utf-8");
  return stable;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(text);
}

function writeSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function addSseClient(res) {
  sseClients.add(res);
  writeSseEvent(res, "ready", { dbVersion, time: new Date().toISOString() });
}

function removeSseClient(res) {
  if (!sseClients.has(res)) return;
  sseClients.delete(res);
}

function broadcastDbUpdated(reason = "save") {
  dbVersion += 1;
  const payload = { dbVersion, reason, time: new Date().toISOString() };
  for (const client of sseClients) {
    try {
      writeSseEvent(client, "db-updated", payload);
    } catch (_err) {
      removeSseClient(client);
      try {
        client.end();
      } catch (_endErr) {
        // ignore
      }
    }
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (chunk) => {
      buf += chunk;
      if (buf.length > 16 * 1024 * 1024) {
        const err = new Error("Payload too large");
        err.code = "PAYLOAD_TOO_LARGE";
        reject(err);
      }
    });
    req.on("end", () => resolve(buf));
    req.on("error", reject);
  });
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (forwarded) return forwarded;
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

function allowDbWrite(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const bucket = dbWriteRateBucket.get(ip) || [];
  const recent = bucket.filter((t) => now - t <= DB_WRITE_RATE_LIMIT_WINDOW_MS);
  if (recent.length >= DB_WRITE_RATE_LIMIT_MAX) {
    dbWriteRateBucket.set(ip, recent);
    return false;
  }
  recent.push(now);
  dbWriteRateBucket.set(ip, recent);
  return true;
}

async function enqueueDbWrite(db) {
  const task = async () => {
    const stable = await writeDb(db);
    broadcastDbUpdated("put-db");
    return stable;
  };
  dbWriteQueue = dbWriteQueue.then(task, task);
  return dbWriteQueue;
}

function collectLanIPv4() {
  const nets = os.networkInterfaces();
  const ips = [];
  const isPrivateLan = (ip) =>
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
  for (const values of Object.values(nets)) {
    for (const item of values || []) {
      if (!item || item.internal) continue;
      if (item.family !== "IPv4") continue;
      if (!isPrivateLan(item.address)) continue;
      ips.push(item.address);
    }
  }
  return [...new Set(ips)];
}

function buildAccessInfo(req) {
  const hostHeader = (req.headers.host || "").split(":")[0];
  const hostname = os.hostname();
  const lanIps = collectLanIPv4();
  const candidates = [];
  const add = (label, url, note = "") => {
    candidates.push({ label, url, note });
  };

  add("当前设备（本机）", `http://localhost:${PORT}/mvp/`);
  add("当前设备（回环）", `http://127.0.0.1:${PORT}/mvp/`);
  if (hostname) {
    add("主机名", `http://${hostname}:${PORT}/mvp/`, "同一局域网可尝试直接访问");
    add("mDNS 主机名", `http://${hostname}.local:${PORT}/mvp/`, "iPad/iPhone 一般优先尝试这个");
  }
  if (MDNS_ALIAS) {
    const aliasHost = MDNS_ALIAS.endsWith(".local") ? MDNS_ALIAS : `${MDNS_ALIAS}.local`;
    add("自定义短域名", `http://${aliasHost}:${PORT}/mvp/`, "推荐收藏这个入口");
  }
  for (const ip of lanIps) {
    add("局域网 IP", `http://${ip}:${PORT}/mvp/`, "手机/平板通用");
  }
  if (hostHeader && hostHeader !== "localhost" && hostHeader !== "127.0.0.1") {
    add("当前访问地址", `http://${hostHeader}:${PORT}/mvp/`, "你现在就是从这个地址访问");
  }
  const dedup = [];
  const seen = new Set();
  for (const item of candidates) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    dedup.push(item);
  }

  return {
    port: PORT,
    hostname,
    hostHeader: hostHeader || null,
    lanIps,
    links: dedup,
  };
}

function renderLanPage(info) {
  const list = info.links
    .map(
      (x) =>
        `<li><a href="${x.url}" target="_blank" rel="noreferrer">${x.url}</a><div class="meta">${x.label}${
          x.note ? ` · ${x.note}` : ""
        }</div></li>`,
    )
    .join("");
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>局域网访问入口</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 0; background: #f3f6f5; color: #1d2a24; }
      .wrap { max-width: 860px; margin: 24px auto; padding: 0 16px; }
      .card { background: #fff; border: 1px solid #d9e0dc; border-radius: 10px; padding: 16px; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      p { margin: 0 0 12px; color: #4f5f57; }
      ul { margin: 0; padding-left: 20px; }
      li { margin: 10px 0; line-height: 1.45; }
      a { color: #116149; font-weight: 600; word-break: break-all; }
      .meta { font-size: 13px; color: #65746d; }
      .tips { margin-top: 14px; font-size: 13px; color: #65746d; }
      .btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
      button { border: 1px solid #d9e0dc; background: #fff; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>局域网访问入口</h1>
        <p>DHCP 变更后 IP 会变，这个页面会实时显示当前可用地址。手机/iPad 打开任意一个即可。</p>
        <ul>${list}</ul>
        <div class="btns">
          <button onclick="location.reload()">刷新地址</button>
          <button onclick="window.location.href='/mvp/'">打开主应用</button>
        </div>
        <div class="tips">建议收藏本页：<code>/lan</code>。当 IP 变化时，先打开本页再跳转。</div>
      </div>
    </div>
  </body>
</html>`;
}

async function serveStatic(req, res, pathname) {
  let relative = pathname === "/" ? "/mvp/index.html" : pathname;
  if (relative.endsWith("/")) relative += "index.html";
  const normalized = path.normalize(relative).replace(/^(\.\.[/\\])+/, "");
  const absPath = path.join(ROOT_DIR, normalized);
  if (!absPath.startsWith(ROOT_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  try {
    const stat = await fs.stat(absPath);
    if (stat.isDirectory()) {
      await serveStatic(req, res, path.join(relative, "index.html"));
      return;
    }
    const ext = path.extname(absPath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const content = await fs.readFile(absPath);
    res.writeHead(200, { "content-type": mime });
    res.end(content);
  } catch (_err) {
    sendText(res, 404, "Not Found");
  }
}

function startMdnsAliasPublisher() {
  const aliasHost = MDNS_ALIAS.endsWith(".local") ? MDNS_ALIAS : `${MDNS_ALIAS}.local`;
  if (!aliasHost || aliasHost === ".local") return null;
  const lanIp = collectLanIPv4()[0];
  if (!lanIp) return null;
  let cmd = "avahi-publish";
  let args = ["-a", "-R", aliasHost, lanIp];
  if (process.platform === "darwin") {
    const aliasName = aliasHost.replace(/\.local$/, "");
    if (!aliasName) return null;
    cmd = "dns-sd";
    args = ["-P", aliasName, "_http._tcp", "local", String(PORT), aliasHost, lanIp, "path=/mvp/"];
  }
  const child = spawn(cmd, args, {
    stdio: "ignore",
    detached: false,
  });
  child.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.warn(`[mdns] publisher start failed: ${err instanceof Error ? err.message : "unknown error"}`);
  });
  child.on("exit", (code) => {
    if (code === 0 || code === null) return;
    // eslint-disable-next-line no-console
    console.warn(`[mdns] publisher exited with code ${code}`);
  });
  return child;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (req.method === "GET" && pathname === "/") {
      res.writeHead(302, { location: "/mvp/" });
      res.end();
      return;
    }

    if (req.method === "GET" && pathname === "/lan") {
      const info = buildAccessInfo(req);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(renderLanPage(info));
      return;
    }

    if (req.method === "GET" && pathname === "/go") {
      const info = buildAccessInfo(req);
      const preferred =
        info.links.find((x) => x.label === "mDNS 主机名") ||
        info.links.find((x) => x.label === "局域网 IP") ||
        info.links.find((x) => x.label === "主机名");
      res.writeHead(302, { location: preferred ? preferred.url : "/mvp/" });
      res.end();
      return;
    }

    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true, time: new Date().toISOString() });
      return;
    }

    if (req.method === "GET" && pathname === "/api/access") {
      sendJson(res, 200, buildAccessInfo(req));
      return;
    }

    if (req.method === "GET" && pathname === "/api/db") {
      const db = await readDb();
      sendJson(res, 200, db);
      return;
    }

    if (req.method === "GET" && pathname === "/api/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        connection: "keep-alive",
      });
      res.write(`retry: 1500\n\n`);
      addSseClient(res);
      const keepAlive = setInterval(() => {
        try {
          res.write(`: heartbeat ${Date.now()}\n\n`);
        } catch (_err) {
          // no-op, close handler will cleanup
        }
      }, 20000);
      req.on("close", () => {
        clearInterval(keepAlive);
        removeSseClient(res);
      });
      req.on("error", () => {
        clearInterval(keepAlive);
        removeSseClient(res);
      });
      return;
    }

    if (req.method === "PUT" && pathname === "/api/db") {
      if (!allowDbWrite(req)) {
        sendJson(res, 429, {
          error: "写入过于频繁，请稍后重试",
          windowMs: DB_WRITE_RATE_LIMIT_WINDOW_MS,
          maxWrites: DB_WRITE_RATE_LIMIT_MAX,
        });
        return;
      }
      const raw = await readBody(req);
      let parsed = null;
      try {
        parsed = JSON.parse(raw || "{}");
      } catch (_err) {
        sendJson(res, 400, { error: "请求体不是合法 JSON" });
        return;
      }
      const stable = await enqueueDbWrite(parsed);
      sendJson(res, 200, stable);
      return;
    }

    await serveStatic(req, res, pathname);
  } catch (err) {
    if (err && err.code === "PAYLOAD_TOO_LARGE") {
      sendJson(res, 413, { error: "请求体过大" });
      return;
    }
    sendJson(res, 500, { error: err instanceof Error ? err.message : "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  const mdnsProc = startMdnsAliasPublisher();
  if (mdnsProc) {
    const stop = () => {
      try {
        mdnsProc.kill("SIGTERM");
      } catch (_err) {
        // ignore
      }
    };
    process.on("exit", stop);
    process.on("SIGINT", () => {
      stop();
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      stop();
      process.exit(0);
    });
  }
  // eslint-disable-next-line no-console
  console.log(`c-chess server running at http://${HOST}:${PORT}`);
  if (MDNS_ALIAS) {
    const aliasHost = MDNS_ALIAS.endsWith(".local") ? MDNS_ALIAS : `${MDNS_ALIAS}.local`;
    // eslint-disable-next-line no-console
    console.log(`mDNS alias preferred: http://${aliasHost}:${PORT}/mvp/`);
  }
});
