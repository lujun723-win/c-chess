import { spawnSync } from "node:child_process";

function runStep(label, cmd, args) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

runStep("数据库备份", "npm", ["run", "backup:db"]);
runStep("发布门禁检查", "npm", ["run", "test:release-check"]);

console.log("\nPASS: release prepare completed");
console.log("下一步：确认视觉验收后即可执行首版发布。");
