import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (chunk) => {
      buf += chunk;
      if (buf.length > 16 * 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(buf));
    req.on("error", reject);
  });
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

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (req.method === "GET" && pathname === "/") {
      res.writeHead(302, { location: "/mvp/" });
      res.end();
      return;
    }

    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true, time: new Date().toISOString() });
      return;
    }

    if (req.method === "GET" && pathname === "/api/db") {
      const db = await readDb();
      sendJson(res, 200, db);
      return;
    }

    if (req.method === "PUT" && pathname === "/api/db") {
      const raw = await readBody(req);
      let parsed = null;
      try {
        parsed = JSON.parse(raw || "{}");
      } catch (_err) {
        sendJson(res, 400, { error: "请求体不是合法 JSON" });
        return;
      }
      const stable = await writeDb(parsed);
      sendJson(res, 200, stable);
      return;
    }

    await serveStatic(req, res, pathname);
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`c-chess server running at http://${HOST}:${PORT}`);
});
