import { app, BrowserWindow, ipcMain } from "electron";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { resolveBundledNode, resolveDshBin, startDshWebProcess } from "./dsh-process";

const SMOKE_MODE = process.env.WORKBENCH_SMOKE === "1";
const PROFILE = process.env.WORKBENCH_PROFILE ?? "workbench";


const WINDOW_CONTROLS_JS = String.raw`(function () {
  if (window.__wbControlsInjected) return;
  window.__wbControlsInjected = true;
  var bar = document.getElementById("wb-window-controls");
  if (bar) return;
  bar = document.createElement("div");
  bar.id = "wb-window-controls";
  var B = ' viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"';
  bar.innerHTML =
    '<button id="wb-min" title="最小化" aria-label="最小化"><svg' + B + '><line x1="2.5" y1="6" x2="9.5" y2="6"/></svg></button>' +
    '<button id="wb-max" title="最大化" aria-label="最大化"><svg' + B + '><rect x="2.5" y="2.5" width="7" height="7" rx="0.8"/></svg></button>' +
    '<button id="wb-close" class="wb-close" title="关闭" aria-label="关闭"><svg' + B + '><line x1="3.2" y1="3.2" x2="8.8" y2="8.8"/><line x1="8.8" y1="3.2" x2="3.2" y2="8.8"/></svg></button>';
  var css = document.createElement("style");
  css.textContent =
    "#wb-window-controls{position:fixed!important;top:0!important;left:0!important;right:80px!important;height:32px!important;display:flex!important;align-items:stretch!important;justify-content:flex-end!important;z-index:2147483647!important;-webkit-app-region:drag!important;user-select:none!important}" +
    "#wb-window-controls button{width:46px!important;height:100%!important;border:none!important;background:transparent!important;color:#333!important;display:flex!important;align-items:center!important;justify-content:center!important;-webkit-app-region:no-drag!important;cursor:default!important;transition:background .08s ease,color .08s ease!important;outline:none!important;padding:0!important;margin:0!important;border-radius:0!important;box-shadow:none!important;position:relative!important;overflow:hidden!important}" +
    "#wb-window-controls button:hover{background:rgba(0,0,0,0.06)!important;color:#000!important}" +
    "#wb-window-controls button:active{background:rgba(0,0,0,0.1)!important;color:#000!important}" +
    "#wb-window-controls button.wb-close:hover{background:#e81123!important;color:#fff!important}" +
    "#wb-window-controls button.wb-close:active{background:#c42b1c!important;color:#fff!important}" +
    "#wb-window-controls svg{width:11px!important;height:11px!important;display:block!important;pointer-events:none!important}";
  document.documentElement.appendChild(css);
  (document.body || document.documentElement).appendChild(bar);
  /* Desktop-shell community markers (anywhere-labs Desktop convention):
     signal the harness that this is the desktop shell and where the
     injected title bar sits, so plugin-side UI can adapt (e.g. a sidebar
     collapse button that must not be covered by the window controls). */
  var dh = document.documentElement;
  dh.setAttribute("data-dsh-desktop", "true");
  dh.setAttribute("data-dsh-desktop-platform", "win32");
  dh.style.setProperty("--dsh-desktop-titlebar-inset", "32px");
  /* Match title bar background to page background */
  function syncBg() {
    try {
      var bg = getComputedStyle(document.documentElement).backgroundColor;
      if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
        bg = getComputedStyle(document.body).backgroundColor;
      }
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        bar.style.background = bg;
        /* Detect dark bg and switch icon color */
        var m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          var r=+m[1],g=+m[2],b=+m[3],bright=(r*299+g*587+b*114)/1000;
          var dark = bright < 128;
          var ic = dark ? "#cccccc" : "#333333";
          var hc = dark ? "#ffffff" : "#000000";
          var hbg = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
          var abg = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
          var style = document.getElementById("wb-controls-style-override");
          if (!style) { style = document.createElement("style"); style.id = "wb-controls-style-override"; document.documentElement.appendChild(style); }
          style.textContent = "#wb-window-controls button{color:" + ic + "!important}#wb-window-controls button:hover{background:" + hbg + "!important;color:" + hc + "!important}#wb-window-controls button:active{background:" + abg + "!important;color:" + hc + "!important}";
        }
      }
    } catch(e) {}
  }
  syncBg();
  /* Push page content below title bar */
  function padBody() {
    if (!document.body) return;
    document.body.style.paddingTop = "32px";
    document.body.style.boxSizing = "border-box";
    var ht = document.documentElement;
    if (getComputedStyle(ht).position !== "fixed") {
      ht.style.marginTop = "0";
    }
  }
  padBody();
  var api = window.workbenchWindow;
  function setMaxIcon(max) {
    var b = document.getElementById("wb-max");
    if (!b) return;
    b.title = max ? "还原" : "最大化";
    b.innerHTML = max
      ? '<svg' + B + '><rect x="4" y="2" width="6.5" height="6.5" rx="0.8"/><path d="M8 3.7V2.5H2.5V8H3.7"/></svg>'
      : '<svg' + B + '><rect x="2.5" y="2.5" width="7" height="7" rx="0.8"/></svg>';
  }
  document.getElementById("wb-min").addEventListener("click", function (e) { e.stopPropagation(); api && api.minimize(); });
  document.getElementById("wb-max").addEventListener("click", function (e) { e.stopPropagation(); api && api.maximizeToggle(); });
  document.getElementById("wb-close").addEventListener("click", function (e) { e.stopPropagation(); api && api.close(); });
  if (api && api.isMaximized) api.isMaximized().then(setMaxIcon);
  if (api && api.onMaximizedChange) api.onMaximizedChange(setMaxIcon);
  /* Re-sync background on load and resize (theme may change) */
  window.addEventListener("load", function() { setTimeout(syncBg, 100); setTimeout(padBody, 100); });
  var mo = new MutationObserver(function() { syncBg(); padBody(); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
})();`;




const FRAMELESS_CSS = `
  /* Ensure top-level scroll containers account for the injected title bar */
  html, body {
    margin: 0 !important;
  }
  button, a, input, select, textarea,
  [role="button"], [role="tab"], [role="slider"], [role="textbox"], [role="menuitem"],
  [contenteditable="true"],
  label, summary, option,
  input[type="range"], input[type="checkbox"], input[type="radio"], input[type="color"],
  .no-drag, [data-no-drag] {
    -webkit-app-region: no-drag !important;
  }
`;

let runtime: { dispose: () => void } | null = null;

function smokeMarkerPath(): string {
  return process.env.WORKBENCH_SMOKE_MARKER ?? join(tmpdir(), "workbench-smoke-marker.txt");
}

function smokeStage(stage: string, detail = ""): void {
  if (!SMOKE_MODE) return;
  try {
    writeFileSync(smokeMarkerPath(), `${stage} ${detail}\n`);
  } catch {
    /* marker is best-effort diagnostics */
  }
}

smokeStage("BOOT", new Date().toISOString());

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  smokeStage("FAIL", "single-instance lock held by another process");
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("will-quit", () => {
    runtime?.dispose();
  });

  app.whenReady().then(main).catch((error) => {
    console.error("workbench main failed:", error);
    smokeFail(error);
    app.exit(1);
  });
}

async function main(): Promise<void> {
  smokeStage("READY");
  const win = createWindow();
  registerWindowControls(win);
  try {
    const url = await resolveTarget();
    await win.loadURL(url);
    smokePass(url);
  } catch (error) {
    console.error("workbench target failed:", error);
    try {
      await win.loadFile(join(__dirname, "..", "..", "renderer-bootstrap", "index.html"));
      smokeFail(error);
    } catch (loadError) {
      smokeFail(loadError);
      app.exit(1);
    }
  }
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: !SMOKE_MODE,
    title: "DeepSeek Harness Workbench",
    backgroundColor: "#ffffff",
    frame: false,
    webPreferences: {
      preload: join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.on("did-finish-load", () => {
    win.webContents.insertCSS(FRAMELESS_CSS).catch(() => {});
    win.webContents
      .executeJavaScript(WINDOW_CONTROLS_JS, true)
      .catch(() => {});
  });

  win.on("maximize", () => win.webContents.send("window:maximized-changed", true));
  win.on("unmaximize", () => win.webContents.send("window:maximized-changed", false));

  return win;
}

function registerWindowControls(win: BrowserWindow): void {
  ipcMain.on("window:minimize", () => win.minimize());
  ipcMain.on("window:maximize-toggle", () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.on("window:close", () => win.close());
  ipcMain.handle("window:is-maximized", () => win.isMaximized());
}

function computeDshHome(): string {
  if (process.env.WORKBENCH_DSH_HOME) {
    return process.env.WORKBENCH_DSH_HOME;
  }
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return join(process.env.PORTABLE_EXECUTABLE_DIR, "data", ".dsh");
  }
  return join(homedir(), ".dsh");
}

function ensureProfile(dshHome: string): void {
  const profileDir = join(dshHome, "profiles", PROFILE);
  if (existsSync(join(profileDir, "package.json"))) {
    return;
  }
  const template = join(process.resourcesPath, "profile-template", PROFILE);
  if (!existsSync(join(template, "package.json"))) {
    throw new Error(
      `profile "${PROFILE}" not found at ${profileDir} and no bundled template exists; ` +
        "create it with: dsh plugin --profile workbench add <package>"
    );
  }
  mkdirSync(profileDir, { recursive: true });
  cpSync(template, profileDir, { recursive: true });
  console.log(`workbench: bootstrapped profile "${PROFILE}" from bundled template into ${profileDir}`);
}

async function resolveTarget(): Promise<string> {
  if (process.env.WORKBENCH_PHASE0_URL) {
    return process.env.WORKBENCH_PHASE0_URL;
  }
  const dshBin = resolveDshBin([
    process.env.WORKBENCH_DSH_BIN,
    join(process.resourcesPath, "dsh", "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js"),
    join(__dirname, "..", "..", "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js")
  ]);
  if (!dshBin) {
    throw new Error("dsh entry not found; set WORKBENCH_DSH_BIN or package resources/dsh");
  }
  const dshHome = computeDshHome();
  ensureProfile(dshHome);
  const nodeBin = resolveBundledNode(process.resourcesPath, "node");
  const proc = await startDshWebProcess({
    profile: PROFILE,
    host: "127.0.0.1",
    port: 0,
    dshBin,
    nodeBin,
    env: { ...process.env, DSH_HOME: dshHome }
  });
  runtime = proc;
  return proc.url;
}

function smokePass(url: string): void {
  if (!SMOKE_MODE) return;
  writeFileSync(smokeMarkerPath(), `PASS ${url}\n`);
  runtime?.dispose();
  app.quit();
}

function smokeFail(error: unknown): void {
  if (!SMOKE_MODE) return;
  writeFileSync(smokeMarkerPath(), `FAIL ${String(error)}\n`);
}









