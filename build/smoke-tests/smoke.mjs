import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const archScript = join(root, "build", "scripts", "check-architecture.mjs");
const repoDshBin = join(root, "apps", "electron", "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");
const runtimeDshBin = join(root, "build", "runtime", "dsh", "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");
const runtimeNodeExe = join(root, "build", "runtime", "node", "node.exe");
const releaseDir = join(root, "release");
const PROFILE = process.env.WORKBENCH_PROFILE ?? "workbench";

const appPkg = JSON.parse(readFileSync(join(root, "apps", "electron", "package.json"), "utf8"));
const PINNED_DSH = appPkg.dependencies?.["@deepseek-ai/dsh"] ?? null;

const results = [];

function record(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`[${status}] ${name}`);
  if (detail) console.log(`         ${detail}`);
}

function quote(arg) {
  return /[\s"^&|<>()]/.test(arg) ? `"${arg}"` : arg;
}

function runCapture(cmd, args, cwd) {
  const composed = [cmd, ...args].map(quote).join(" ");
  return spawnSync(composed, { cwd, shell: true, encoding: "utf8", timeout: 300000 });
}

const APP_IMAGE = "DeepSeek-Harness-Workbench";

function killTree(pid) {
  if (pid === undefined) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"]);
  } else {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
}

function killAppByImage() {
  if (process.platform !== "win32") return;
  spawnSync("taskkill", ["/IM", `${APP_IMAGE}*.exe`, "/T", "/F"]);
}

async function rmWithRetry(target, label) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      rmSync(target, { recursive: true, force: true });
      return;
    } catch (error) {
      killAppByImage();
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 3000));
      if (attempt === 5) {
        console.warn(`smoke: cleanup failed for ${label}: ${error.code ?? error.message}`);
      }
    }
  }
}

async function bootWebAndProbe() {
  const child = spawn(process.execPath, [repoDshBin, "--profile", PROFILE, "--host", "127.0.0.1", "--port", "0"], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  let buffer = "";
  const url = await new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      rejectPromise(new Error(`no URL within 90s; output: ${buffer}`));
    }, 90000);
    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const match = /http:\/\/127\.0\.0\.1:(\d+)/.exec(buffer);
      if (match) {
        clearTimeout(timer);
        resolvePromise(`http://127.0.0.1:${match[1]}`);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      clearTimeout(timer);
      rejectPromise(new Error(`dsh exited early (${code}); output: ${buffer}`));
    });
  });
  try {
    let lastError = null;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          return `HTTP ${response.status} on ${url}`;
        }
        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
    }
    throw new Error(`probe failed on ${url}: ${lastError}`);
  } finally {
    killTree(child.pid);
  }
}

const PORTABLE_TIMEOUT_MS = 600000;

async function launchPortableAndWait(marker, extraEnv) {
  const files = existsSync(releaseDir) ? readdirSafe(releaseDir) : [];
  const portableExe = files.find((f) => /^DeepSeek-Harness-Workbench-.*-Portable-x64\.exe$/.test(f));
  if (!portableExe) {
    return { skipped: true };
  }
  rmSync(marker, { force: true });
  const child = spawn(join(releaseDir, portableExe), [], {
    env: { ...process.env, WORKBENCH_SMOKE: "1", WORKBENCH_SMOKE_MARKER: marker, ...extraEnv },
    stdio: "ignore",
    detached: false
  });
  const readMarker = () => {
    try {
      return readFileSync(marker, "utf8").trim();
    } catch {
      return "";
    }
  };
  const deadline = Date.now() + PORTABLE_TIMEOUT_MS;
  let content = "";
  while (Date.now() < deadline) {
    content = readMarker();
    if (content.startsWith("PASS") || content.startsWith("FAIL")) break;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2000));
  }
  killTree(child.pid);
  killAppByImage();
  if (!content.startsWith("PASS") && !content.startsWith("FAIL")) {
    return {
      skipped: false,
      exe: portableExe,
      fail: `no PASS/FAIL within ${PORTABLE_TIMEOUT_MS / 1000}s (last marker: "${content || "none"}")`
    };
  }
  if (!content.startsWith("PASS")) {
    return { skipped: false, exe: portableExe, fail: content };
  }
  return { skipped: false, exe: portableExe, content };
}

async function runPortableSmoke() {
  const marker = join(tmpdir(), "workbench-portable-smoke-marker.txt");

  killAppByImage();

  const cleanHome = join(tmpdir(), `workbench-smoke-dsh-home-${Date.now()}`);
  await rmWithRetry(cleanHome, "clean DSH_HOME");
  const clean = await launchPortableAndWait(marker, { WORKBENCH_DSH_HOME: cleanHome });
  if (clean.skipped) {
    record("portable smoke: clean-machine bootstrap + boot", "SKIPPED", "portable artifact not built yet");
  } else if (clean.fail) {
    record("portable smoke: clean-machine bootstrap + boot", "FAIL", clean.fail);
  } else if (clean.content?.startsWith("PASS")) {
    const bootstrapped = existsSync(join(cleanHome, "profiles", "workbench", "package.json"));
    if (bootstrapped) {
      record(
        "portable smoke: clean-machine bootstrap + boot",
        "PASS",
        `${clean.content}; offline profile template applied`
      );
    } else {
      record(
        "portable smoke: clean-machine bootstrap + boot",
        "FAIL",
        `${clean.content} but no bootstrapped profile at ${cleanHome}`
      );
    }
  } else {
    record("portable smoke: clean-machine bootstrap + boot", "FAIL", clean.content ?? "unknown");
  }
  await rmWithRetry(cleanHome, "clean DSH_HOME");

  killAppByImage();
  const isolationData = join(releaseDir, "data");
  await rmWithRetry(isolationData, "portable data dir");
  const isolated = await launchPortableAndWait(marker, {});
  if (isolated.skipped) {
    record("portable smoke: DSH_HOME isolation", "SKIPPED", "portable artifact not built yet");
  } else if (isolated.fail) {
    record("portable smoke: DSH_HOME isolation", "FAIL", isolated.fail);
  } else if (isolated.content?.startsWith("PASS")) {
    const profileInData = existsSync(join(isolationData, ".dsh", "profiles", "workbench", "package.json"));
    if (profileInData) {
      record(
        "portable smoke: DSH_HOME isolation",
        "PASS",
        `${isolated.content}; data at <exe>/data/.dsh (ADR-003)`
      );
    } else {
      record(
        "portable smoke: DSH_HOME isolation",
        "FAIL",
        `${isolated.content} but <exe>/data/.dsh profile missing`
      );
    }
  } else {
    record("portable smoke: DSH_HOME isolation", "FAIL", isolated.content ?? "unknown");
  }
  killAppByImage();
  await rmWithRetry(isolationData, "portable data dir");
}

function readdirSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

console.log("== DeepSeek Harness Workbench smoke suite ==");

const arch = spawnSync(process.execPath, [archScript], { encoding: "utf8" });
if (arch.status === 0) {
  record("architecture guard", "PASS", arch.stdout.trim());
} else {
  record("architecture guard", "FAIL", arch.stdout.trim() || arch.stderr.trim());
}

if (!PINNED_DSH) {
  record("DSH pin resolved", "FAIL", "apps/electron dependency missing @deepseek-ai/dsh");
} else if (!existsSync(repoDshBin)) {
  record("DSH pin resolved", "FAIL", "repo dsh entry missing (run pnpm install)");
} else {
  const version = runCapture(process.execPath, [repoDshBin, "--version"], root);
  const actual = (version.stdout ?? "").trim();
  if (version.status === 0 && actual === PINNED_DSH) {
    record("DSH pin resolved", "PASS", `${actual} (exact pin matches lockfile-free check)`);
  } else {
    record("DSH pin resolved", "FAIL", `expected ${PINNED_DSH}, got "${actual}" (exit ${version.status})`);
  }
}

const dump = runCapture(process.execPath, [repoDshBin, "--profile", PROFILE, "--dump-config"], root);
if (dump.status === 0 && (dump.stdout ?? "").length > 0) {
  const lines = (dump.stdout.match(/^# ==/gm) ?? []).length;
  record(`workbench profile parses (dsh --profile ${PROFILE} --dump-config)`, "PASS", `${lines} bundle layer headers`);
} else {
  record(`workbench profile parses (dsh --profile ${PROFILE} --dump-config)`, "FAIL", (dump.stderr ?? "").split("\n")[0]);
}

if (existsSync(repoDshBin)) {
  try {
    const detail = await bootWebAndProbe();
    record("DSH host boots + client HTTP probe", "PASS", detail);
  } catch (error) {
    record("DSH host boots + client HTTP probe", "FAIL", String(error).split("\n")[0]);
  }
} else {
  record("DSH host boots + client HTTP probe", "SKIPPED", "repo dsh entry missing");
}

if (existsSync(runtimeDshBin) && existsSync(runtimeNodeExe)) {
  record("runtime staging (bundled dsh + node.exe)", "PASS", "build/runtime ready for packaging");
} else {
  record("runtime staging (bundled dsh + node.exe)", "SKIPPED", "run pnpm package first");
}

const releaseFiles = readdirSafe(releaseDir);
const setupExe = releaseFiles.find((f) => /^DeepSeek-Harness-Workbench-.*-Setup-x64\.exe$/.test(f));
const portableExists = releaseFiles.some((f) => /^DeepSeek-Harness-Workbench-.*-Portable-x64\.exe$/.test(f));
const sumsExists = releaseFiles.includes("SHA256SUMS.txt");
if (setupExe && portableExists && sumsExists) {
  record("release artifacts (Setup/Portable/SHA256SUMS)", "PASS", `${setupExe} + portable + checksums`);
} else {
  record(
    "release artifacts (Setup/Portable/SHA256SUMS)",
    "SKIPPED",
    `run pnpm package (setup=${Boolean(setupExe)}, portable=${portableExists}, sums=${sumsExists})`
  );
}

await runPortableSmoke();

record(
  "clean-machine install test (Setup.exe, no dev tools)",
  "SKIPPED",
  "portable clean-bootstrap covers bundled-runtime path; full NSIS install needs a VM; NOT VERIFIED here"
);

const failed = results.filter((r) => r.status === "FAIL").length;
const skipped = results.filter((r) => r.status === "SKIPPED").length;
const passed = results.filter((r) => r.status === "PASS").length;
console.log(`== summary: ${passed} PASS, ${failed} FAIL, ${skipped} SKIPPED ==`);
if (failed > 0) {
  process.exit(1);
}
if (skipped > 0 && process.env.WORKBENCH_SMOKE_STRICT === "1") {
  process.exit(1);
}
