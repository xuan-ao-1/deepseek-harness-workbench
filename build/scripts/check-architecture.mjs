#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  "release",
  "coverage",
  ".vite",
  ".dsh-local",
]);

const CODE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".htm",
  ".vue",
]);

const violations = [];
let scannedFiles = 0;

function walk(dir, visit) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, visit);
    } else if (entry.isFile()) {
      scannedFiles += 1;
      visit(full);
    }
  }
}

const rel = (file) => relative(root, file).split(sep).join("/");

// P3: 所有组合必须使用官方 Profile + Bundle，禁止平行组合格式
function ruleNoParallelCompositionFormats() {
  const forbidden = new Set(["workbench-plugin.json", "composition.json", "workspace-recipe.json"]);
  walk(root, (file) => {
    if (forbidden.has(basename(file))) {
      violations.push(`P3: parallel composition manifest ${rel(file)}`);
    }
  });
}

// P2/P7: 禁止 Workbench Plugin API 与私有 RPC；只扫描代码目录，不扫描文档
function ruleNoWorkbenchPluginApiOrRpc() {
  const scopes = ["apps", "packages", "fixtures"].map((name) => join(root, name));
  const patterns = [
    [/workbench\s*\.\s*register(?:Plugin|Panel|Tool|Agent)\s*\(/, "P2: Workbench Plugin API"],
    [/workbench\s*\.\s*invoke\s*\(/, "P7: private Workbench RPC"],
  ];
  for (const scope of scopes) {
    walk(scope, (file) => {
      if (!CODE_EXTS.has(extname(file))) return;
      let text;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        return;
      }
      for (const [re, tag] of patterns) {
        if (re.test(text)) violations.push(`${tag}: ${rel(file)}`);
      }
    });
  }
}

// P1: 禁止 vendor/内嵌官方 core（packages 下不得出现 @deepseek-ai/**）
function ruleNoVendoredOrPatchedCore() {
  walk(join(root, "packages"), (file) => {
    if (rel(file).split("/").includes("@deepseek-ai")) {
      violations.push(`P1: vendored/patched official package ${rel(file)}`);
    }
  });
}

// P6: Electron main 保持瘦壳，业务功能不得进入
function ruleElectronMainStaysThin() {
  const mainDir = join(root, "apps", "electron", "main");
  const forbiddenParts = new Set([
    "git",
    "ide",
    "agent-team",
    "extension-center",
    "marketplace",
    "collaboration",
  ]);
  walk(mainDir, (file) => {
    const parts = relative(mainDir, file).split(sep).slice(0, -1);
    for (const part of parts) {
      if (forbiddenParts.has(part.toLowerCase())) {
        violations.push(`P6: feature module inside Electron main (${part}): ${rel(file)}`);
        break;
      }
    }
  });
}

ruleNoParallelCompositionFormats();
ruleNoWorkbenchPluginApiOrRpc();
ruleNoVendoredOrPatchedCore();
ruleElectronMainStaysThin();

if (violations.length > 0) {
  console.error(`architecture check: FAILED (${violations.length} violation(s), ${scannedFiles} files scanned)`);
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log(`architecture check: passed (${scannedFiles} files scanned)`);
