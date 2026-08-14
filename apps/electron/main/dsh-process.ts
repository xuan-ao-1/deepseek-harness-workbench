import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface DshWebOptions {
  profile: string;
  host: string;
  port: number;
  dshBin: string;
  nodeBin: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface DshWebProcess {
  url: string;
  port: number;
  child: ChildProcess;
  dispose: () => void;
}

const URL_PATTERN = /http:\/\/(127\.0\.0\.1|localhost|\[::1\]):(\d+)/;

export function resolveBundledNode(resourcesPath: string | undefined, fallback: string): string {
  if (resourcesPath) {
    const bundled = join(resourcesPath, "node", "node.exe");
    if (existsSync(bundled)) return bundled;
  }
  return fallback;
}

export function resolveDshBin(candidates: Array<string | undefined>): string | null {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
}

export function killTree(child: ChildProcess): void {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
  } else {
    child.kill("SIGTERM");
  }
}

export async function startDshWebProcess(options: DshWebOptions): Promise<DshWebProcess> {
  const { profile, host, port, dshBin, nodeBin } = options;
  const timeoutMs = options.timeoutMs ?? 60000;
  const child = spawn(
    nodeBin,
    [dshBin, "--profile", profile, "--host", host, "--port", String(port)],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: options.env ?? process.env,
      windowsHide: true,
    }
  );

  return await new Promise<DshWebProcess>((resolve, reject) => {
    let buffer = "";
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const finish = (error: Error | null, url?: string, resolvedPort?: number): void => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      if (error) {
        killTree(child);
        reject(error);
        return;
      }
      resolve({
        url: url as string,
        port: resolvedPort as number,
        child,
        dispose: () => killTree(child),
      });
    };

    timer = setTimeout(() => {
      finish(new Error(`dsh web did not report a URL within ${timeoutMs}ms; output: ${buffer}`));
    }, timeoutMs);

    const onData = (chunk: Buffer): void => {
      buffer += chunk.toString("utf8");
      const match = URL_PATTERN.exec(buffer);
      if (match) {
        finish(null, `http://127.0.0.1:${match[2]}`, Number(match[2]));
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (error) => finish(error));
    child.on("exit", (code) => {
      finish(new Error(`dsh web exited early with code ${code}; output: ${buffer}`));
    });
  });
}
