import { app, BrowserWindow, WebContentsView, ipcMain } from "electron";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { resolveBundledNode, resolveDshBin, startDshWebProcess } from "./dsh-process";

const SMOKE_MODE = process.env.WORKBENCH_SMOKE === "1";
const PROFILE = process.env.WORKBENCH_PROFILE ?? "workbench";
const TITLEBAR_HEIGHT = 32;

/*
 * Layered shell (ADR-013): the frameless window hosts two sibling
 * WebContentsViews — a 32px shell title bar on top (drag region +
 * self-drawn window controls, TraeWork style) and the dsh web app below it.
 * The app content physically starts at y=32, so no drag region ever overlays
 * plugin UI: every fixed-position plugin element stays visible and
 * clickable, regardless of how many nested popups it opens.
 */

/* Injected into the APP view (not the shell bar): community desktop-shell
 * markers (anywhere-labs Desktop convention) plus a theme broadcast so the
 * shell bar can match its background and icon colors to the app theme.
 * With the layered shell the title bar never covers the app viewport, so
 * the inset exposed to convention-following plugins is 0. */
const APP_MARKERS_JS = `(function () {
  if (window.__wbMarkersInjected) return;
  window.__wbMarkersInjected = true;
  var dh = document.documentElement;
  dh.setAttribute("data-dsh-desktop", "true");
  dh.setAttribute("data-dsh-desktop-platform", "win32");
  dh.style.setProperty("--dsh-desktop-titlebar-inset", "0px");
  function pushTheme() {
    try {
      var bg = getComputedStyle(document.documentElement).backgroundColor;
      if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
        bg = getComputedStyle(document.body).backgroundColor;
      }
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        if (window.workbenchWindow && window.workbenchWindow.notifyTheme) {
          window.workbenchWindow.notifyTheme(bg);
        }
      }
    } catch (e) {}
  }
  pushTheme();
  window.addEventListener("load", function () { setTimeout(pushTheme, 100); });
  var mo = new MutationObserver(pushTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
})();`;

let runtime: { dispose: () => void } | null = null;
let titleBarView: WebContentsView | null = null;
let appView: WebContentsView | null = null;

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
    await appView!.webContents.loadURL(url);
    smokePass(url);
  } catch (error) {
    console.error("workbench target failed:", error);
    try {
      await appView!.webContents.loadFile(join(__dirname, "..", "..", "renderer-bootstrap", "index.html"));
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

  const viewWebPreferences = {
    preload: join(__dirname, "..", "preload", "index.js"),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  };
  titleBarView = new WebContentsView({ webPreferences: viewWebPreferences });
  appView = new WebContentsView({ webPreferences: viewWebPreferences });
  win.contentView.addChildView(titleBarView);
  win.contentView.addChildView(appView);
  layoutViews(win);
  win.on("resize", () => layoutViews(win));

  titleBarView.webContents
    .loadFile(join(__dirname, "..", "..", "renderer-shell", "index.html"))
    .catch((error) => console.error("workbench shell bar load failed:", error));

  appView!.webContents.on("did-finish-load", () => {
    appView!.webContents.executeJavaScript(APP_MARKERS_JS, true).catch(() => {});
  });

  win.on("maximize", () => {
    titleBarView?.webContents.send("window:maximized-changed", true);
    layoutViews(win);
  });
  win.on("unmaximize", () => {
    titleBarView?.webContents.send("window:maximized-changed", false);
    layoutViews(win);
  });

  return win;
}

function layoutViews(win: BrowserWindow): void {
  if (!titleBarView || !appView) return;
  const [width, height] = win.getContentSize();
  titleBarView.setBounds({ x: 0, y: 0, width, height: TITLEBAR_HEIGHT });
  appView.setBounds({
    x: 0,
    y: TITLEBAR_HEIGHT,
    width,
    height: Math.max(0, height - TITLEBAR_HEIGHT)
  });
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
  /* App view -> shell bar theme relay (background matching + icon colors). */
  ipcMain.on("shell:theme", (_event, background: string) => {
    if (!titleBarView) return;
    titleBarView.webContents
      .executeJavaScript(`window.__setBarTheme && window.__setBarTheme(${JSON.stringify(background)})`, true)
      .catch(() => {});
  });
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