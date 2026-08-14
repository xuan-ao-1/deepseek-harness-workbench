import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const releaseDir = join(root, "release");

const env = {
  ...process.env,
  ELECTRON_MIRROR: process.env.ELECTRON_MIRROR ?? "https://npmmirror.com/mirrors/electron/",
  ELECTRON_BUILDER_BINARIES_MIRROR:
    process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??
    "https://npmmirror.com/mirrors/electron-builder-binaries/"
};

function quote(arg) {
  return /[\s"^&|<>()]/.test(arg) ? `"${arg}"` : arg;
}

function run(cmd, args, cwd) {
  const composed = [cmd, ...args].map(quote).join(" ");
  const result = spawnSync(composed, { stdio: "inherit", cwd, shell: true, env });
  if (result.status !== 0) {
    throw new Error(`command failed (${result.status}): ${composed}`);
  }
}

run("node", [join("build", "scripts", "prepare-runtime.mjs")], root);
run("pnpm", ["-C", "apps/electron", "run", "build"], root);
run(
  "pnpm",
  ["-C", "apps/electron", "exec", "electron-builder", "--config", "../../build/installer/electron-builder.yml", "--win"],
  root
);

const hashes = [];
for (const name of readdirSync(releaseDir).sort()) {
  if (!name.endsWith(".exe")) continue;
  const digest = createHash("sha256").update(readFileSync(join(releaseDir, name))).digest("hex");
  hashes.push(`${digest}  ${name}`);
}
if (hashes.length === 0) {
  throw new Error("no .exe artifacts found in release/");
}
writeFileSync(join(releaseDir, "SHA256SUMS.txt"), hashes.join("\n") + "\n");
console.log(hashes.join("\n"));
console.log("package: done");
