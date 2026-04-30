import { spawnSync } from "node:child_process";

function supportsOptionalChaining() {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("obj", "return obj?.x === 1;");
    return fn({ x: 1 }) === true;
  } catch (_err) {
    return false;
  }
}

const scripts = ["test:realtime-sync", "test:release-gate"];
if (supportsOptionalChaining()) {
  scripts.unshift("test:regression");
} else {
  console.warn("SKIP: test:regression (当前 Node 运行时不支持可选链语法)");
}

for (const scriptName of scripts) {
  console.log(`\n==> npm run ${scriptName}`);
  const result = spawnSync("npm", ["run", scriptName], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log("\nPASS: release check bundle");
