import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "server", "data", "db.json");
const BACKUP_DIR = path.join(ROOT, "server", "backups");

function pad(v) {
  return String(v).padStart(2, "0");
}

function timestampTag(date = new Date()) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function ensureDbShape(raw) {
  const base = {
    users: [],
    families: [],
    familyMembers: [],
    studyData: [],
    games: [],
    reviews: [],
    battles: [],
  };
  const merged = { ...base, ...(raw || {}) };
  for (const key of Object.keys(base)) {
    if (!Array.isArray(merged[key])) {
      throw new Error(`备份文件结构不合法：${key} 必须是数组`);
    }
  }
  return merged;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const sourceArg = process.argv[2];
  if (!sourceArg) {
    throw new Error("用法：node tools/restore-db.js <backup-file>");
  }
  const sourcePath = path.resolve(sourceArg);
  const parsed = await readJson(sourcePath);
  const safeDb = ensureDbShape(parsed);

  await ensureDir(DB_PATH);
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
    const rollbackCopy = path.join(BACKUP_DIR, `pre_restore_${timestampTag()}.json`);
    await fs.copyFile(DB_PATH, rollbackCopy);
  } catch (_err) {
    // no existing db, skip auto-backup
  }
  await fs.writeFile(DB_PATH, `${JSON.stringify(safeDb, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        restoredFrom: sourcePath,
        dbPath: DB_PATH,
        restoredAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
