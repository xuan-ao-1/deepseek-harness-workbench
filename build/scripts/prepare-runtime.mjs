import { spawnSync } from "node:child_process";
import { createWriteStream, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const runtimeDir = join(root, "build", "runtime");
const dshDir = join(runtimeDir, "dsh");
const nodeDir = join(runtimeDir, "node");

const DSH_VERSION = process.env.WORKBENCH_DSH_VERSION ?? "0.1.0-rc.6";
const NODE_VERSION = process.env.WORKBENCH_NODE_VERSION ?? "24.19.0";
const NODE_MIRROR = process.env.WORKBENCH_NODE_MIRROR ?? "https://npmmirror.com/mirrors/node";
const FORCE = process.env.WORKBENCH_FORCE_RUNTIME === "1";

function quote(arg) {
  return /[\s"^&|<>()]/.test(arg) ? `"${arg}"` : arg;
}

function run(cmd, args, cwd) {
  const composed = [cmd, ...args].map(quote).join(" ");
  const result = spawnSync(composed, { stdio: "inherit", cwd, shell: true });
  if (result.status !== 0) {
    throw new Error(`command failed (${result.status}): ${composed}`);
  }
}

async function prepareDsh() {
  mkdirSync(dshDir, { recursive: true });
  writeFileSync(
    join(dshDir, "package.json"),
    JSON.stringify(
      {
        name: "dsh-workbench-runtime",
        private: true,
        dependencies: {
          "@deepseek-ai/dsh": DSH_VERSION
        }
      },
      null,
      2
    ) + "\n"
  );
  writeFileSync(
    join(dshDir, "pnpm-workspace.yaml"),
    [
      "packages:",
      "  - .",
      "",
      "nodeLinker: hoisted",
      "autoInstallPeers: true",
      "allowBuilds:",
      "  '@deepseek-ai/dsh-subprocess-local': true",
      "  '@google/genai': true",
      "  koffi: true",
      "  node-pty: true",
      "  protobufjs: true",
      ""
    ].join("\n")
  );
  writeFileSync(
    join(dshDir, ".npmrc"),
    [
      "registry=https://registry.npmmirror.com",
      "network-concurrency=4",
      "fetch-retries=5",
      "fetch-timeout=120000",
      "electron_mirror=https://npmmirror.com/mirrors/electron/",
      ""
    ].join("\n")
  );
  const installed = existsSync(join(dshDir, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js"));
  if (installed && !FORCE) {
    console.log(`runtime dsh ${DSH_VERSION} already staged, skipping install`);
    return;
  }
  run("pnpm", ["install", "--prod"], dshDir);
  console.log(`runtime dsh ${DSH_VERSION} staged`);
}

async function prepareNode() {
  const nodeExe = join(nodeDir, "node.exe");
  if (existsSync(nodeExe) && !FORCE) {
    console.log(`runtime node ${NODE_VERSION} already staged, skipping download`);
    return;
  }
  await rm(nodeDir, { recursive: true, force: true });
  await mkdir(nodeDir, { recursive: true });
  const zipName = `node-v${NODE_VERSION}-win-x64.zip`;
  const url = `${NODE_MIRROR}/v${NODE_VERSION}/${zipName}`;
  const zipPath = join(runtimeDir, zipName);
  console.log(`downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`node download failed: ${response.status} ${url}`);
  }
  const body = response.body;
  if (body === null) {
    throw new Error(`node download returned empty body: ${url}`);
  }
  const stream = createWriteStream(zipPath);
  const reader = body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    stream.write(Buffer.from(value));
  }
  await new Promise((resolvePromise, rejectPromise) => {
    stream.end(resolvePromise);
    stream.on("error", rejectPromise);
  });
  const extractDir = join(runtimeDir, "node-extract");
  await rm(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });
  const tarResult = spawnSync("tar", ["-xf", zipPath, "-C", extractDir], { stdio: "inherit" });
  if (tarResult.status !== 0) {
    throw new Error("tar extraction of node zip failed");
  }
  await rename(join(extractDir, `node-v${NODE_VERSION}-win-x64`, "node.exe"), nodeExe);
  await rm(extractDir, { recursive: true, force: true });
  await rm(zipPath, { force: true });
  console.log(`runtime node ${NODE_VERSION} staged`);
}

function fixProfileBuildPermissions(profileDir) {
  const yamlPath = join(profileDir, "pnpm-workspace.yaml");
  if (!existsSync(yamlPath)) return;
  const text = readFileSync(yamlPath, "utf8");
  if (text.includes("set this to true or false")) {
    writeFileSync(yamlPath, text.replace(/set this to true or false/g, "true"));
    console.log(`patched allowBuilds placeholders in ${yamlPath}`);
  }
}

function runOfficialProfileAdd(nodeBin, dshBin, webAppSpec, sandboxHome) {
  const result = spawnSync(
    nodeBin,
    [dshBin, "plugin", "--profile", "workbench", "add", webAppSpec],
    { stdio: "inherit", env: { ...process.env, DSH_HOME: sandboxHome } }
  );
  return result.status;
}

async function prepareProfileTemplate() {
  const templateRoot = join(runtimeDir, "profile-template");
  const marker = join(templateRoot, ".dsh-version");
  const target = join(templateRoot, "workbench");
  if (
    existsSync(marker) &&
    readFileSync(marker, "utf8").trim() === DSH_VERSION &&
    existsSync(join(target, "package.json")) &&
    !FORCE
  ) {
    console.log(`profile template ${DSH_VERSION} already staged, skipping generation`);
    return;
  }
  await rm(templateRoot, { recursive: true, force: true });
  const sandboxHome = join(runtimeDir, "profile-template-home");
  await rm(sandboxHome, { recursive: true, force: true });
  const nodeBin = join(nodeDir, "node.exe");
  const dshBin = join(dshDir, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");
  const webAppSpec = `@deepseek-ai/dsh-web-app@${DSH_VERSION}`;
  console.log(`generating profile template via official command (dsh plugin add ${webAppSpec})`);
  let status = runOfficialProfileAdd(nodeBin, dshBin, webAppSpec, sandboxHome);
  if (status !== 0) {
    const sandboxProfile = join(sandboxHome, "profiles", "workbench");
    if (!existsSync(join(sandboxProfile, "package.json"))) {
      throw new Error(`official profile generation failed (${status}) before profile creation`);
    }
    fixProfileBuildPermissions(sandboxProfile);
    console.log("retrying official profile generation after allowBuilds patch");
    status = runOfficialProfileAdd(nodeBin, dshBin, webAppSpec, sandboxHome);
  }
  if (status !== 0) {
    throw new Error(`official profile generation failed (${status})`);
  }
  const generated = join(sandboxHome, "profiles", "workbench");
  if (!existsSync(join(generated, "package.json"))) {
    throw new Error(`official profile generation produced no manifest at ${generated}`);
  }
  const manifest = JSON.parse(readFileSync(join(generated, "package.json"), "utf8"));
  const bundles = manifest?.dsh?.profile?.bundles ?? [];
  if (!Array.isArray(bundles) || !bundles.includes("@deepseek-ai/dsh-web-app")) {
    throw new Error(`official profile manifest incomplete: bundles=${JSON.stringify(bundles)}`);
  }
  // Remove the top-level dependency list minted by `dsh plugin add`. Keeping it
  // makes pnpm (nodeLinker: hoisted) hoist a second copy of @deepseek-ai/dsh-tools
  // into the profile own node_modules, yielding a distinct TOOL_RUNTIME_SCHEDULER
  // Symbol from the runtime copy. dsh-agent-loop then reads ctx.tools via its own
  // Symbol and hits `undefined.prepare` at tool dispatch. Web profile works because
  // it declares no dependencies and resolves everything from the shared tree.
  delete manifest.dependencies;
  writeFileSync(join(generated, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  mkdirSync(templateRoot, { recursive: true });
  cpSync(generated, target, { recursive: true });
  // A staged template must not carry a per-profile node_modules (that would
  // reintroduce the dual-instance Symbol problem). Rely on the shared tree.
  rmSync(join(target, "node_modules"), { recursive: true, force: true });
  // Re-enable the pwsh/bash tools that dsh-web-app disables unconditionally.
  // On win32 the pwsh backend works (used by the headless profile); keeping them
  // disabled leaves the Bash tool on the tool list with no working backend, so
  // calls fail with "terminal inspection is unsupported on platform win32".
  writeFileSync(
    join(target, "cordis.patch.yml"),
    [
      "# Re-enable shell tools disabled by dsh-web-app; pwsh works on win32.",
      "- id: tool-pwsh",
      "  disabled: false",
      "- id: tool-bash",
      "  disabled: false",
      ""
    ].join("\n")
  );
  writeFileSync(marker, `${DSH_VERSION}\n`);
  await rm(sandboxHome, { recursive: true, force: true });
  console.log(`profile template ${DSH_VERSION} staged at ${target}`);
}

await prepareDsh();
await prepareNode();
await prepareProfileTemplate();
console.log("prepare-runtime: done");
