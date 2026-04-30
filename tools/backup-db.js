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

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_err) {
    return false;
  }
}

async function main() {
  const customTarget = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (!(await exists(DB_PATH))) {
    throw new Error(`数据库文件不存在：${DB_PATH}\n请先启动一次服务生成数据库。`);
  }
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const target = customTarget || path.join(BACKUP_DIR, `db_${timestampTag()}.json`);
  await fs.copyFile(DB_PATH, target);
  const stat = await fs.stat(target);
  console.log(
    JSON.stringify(
      {
        ok: true,
        source: DB_PATH,
        backup: target,
        bytes: stat.size,
        createdAt: new Date().toISOString(),
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
