import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";
import { DEFAULT_LOCAL_API_PORT, DEFAULT_LOCAL_PORTAL_PORT } from "@isac-erp/shared";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export interface CampusServicePaths {
  apiEntry: string;
  apiCwd: string;
  portalCwd: string;
  portalNextBin: string;
}

let apiProcess: ChildProcess | null = null;
let portalProcess: ChildProcess | null = null;
let tunnelProcess: ChildProcess | null = null;

function getMonorepoRoot(): string {
  return join(__dirname, "../../../../");
}

function resolveCampusServicePaths(): CampusServicePaths | null {
  if (app.isPackaged) {
    const bundleRoot = join(process.resourcesPath, "campus-server");
    const apiEntry = join(bundleRoot, "api", "dist", "index.js");
    const portalCwd = join(bundleRoot, "portal");
    const portalNextBin = join(portalCwd, "node_modules/next/dist/bin/next");
    if (!existsSync(apiEntry) || !existsSync(portalNextBin)) return null;
    return {
      apiEntry,
      apiCwd: join(bundleRoot, "api"),
      portalCwd,
      portalNextBin,
    };
  }

  const root = getMonorepoRoot();
  const apiEntry = join(root, "packages/api/dist/index.js");
  const portalCwd = join(root, "apps/web-portail");
  const portalNextBin = join(portalCwd, "node_modules/next/dist/bin/next");
  if (!existsSync(apiEntry) || !existsSync(portalNextBin)) return null;
  return {
    apiEntry,
    apiCwd: join(root, "packages/api"),
    portalCwd,
    portalNextBin,
  };
}

/** Charge DATABASE_URL et autres variables depuis server.env ou, en dev, packages/db/.env. */
function loadServerEnv(): Record<string, string> {
  const parsed: Record<string, string> = {};

  const envPath = join(app.getPath("userData"), "server.env");
  if (existsSync(envPath)) {
    Object.assign(parsed, parseEnvFile(readFileSync(envPath, "utf-8")));
  }

  if (!parsed.DATABASE_URL && !app.isPackaged) {
    const devDbEnv = join(getMonorepoRoot(), "packages/db/.env");
    if (existsSync(devDbEnv)) {
      Object.assign(parsed, parseEnvFile(readFileSync(devDbEnv, "utf-8")));
    }
  }

  return parsed;
}

function parseEnvFile(content: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function spawnNodeScript(
  label: string,
  scriptPath: string,
  cwd: string,
  extraEnv: Record<string, string>,
  args: string[] = []
): ChildProcess {
  const child: ChildProcess = spawn(process.execPath, [scriptPath, ...args], {
    cwd,
    env: { ...process.env, ...extraEnv, NODE_ENV: "production", ELECTRON_RUN_AS_NODE: "1" },
    stdio: "pipe",
    windowsHide: true,
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    console.log(`[${label}] ${chunk.toString().trimEnd()}`);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    console.error(`[${label}] ${chunk.toString().trimEnd()}`);
  });

  return child;
}

/** Lance le connecteur Cloudflare avec le jeton d'un tunnel nommé (configuration locale uniquement). */
function startCloudflareTunnel(serverEnv: Record<string, string>): void {
  const token = serverEnv.CLOUDFLARE_TUNNEL_TOKEN?.trim();
  if (!token || (tunnelProcess && tunnelProcess.exitCode === null)) return;

  const executableCandidates = [
    serverEnv.CLOUDFLARED_PATH,
    "C:\\Program Files\\cloudflared\\cloudflared.exe",
    "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
  ].filter((value): value is string => Boolean(value));
  const executable = executableCandidates.find((candidate) => existsSync(candidate));

  if (!executable) {
    console.warn("[campus-services] Cloudflared introuvable : installez Cloudflare Tunnel pour activer l'accès distant.");
    return;
  }

  tunnelProcess = spawn(executable, ["tunnel", "--no-autoupdate", "run", "--token", token], {
    env: { ...process.env },
    stdio: "pipe",
    windowsHide: true,
  });
  tunnelProcess.stdout?.on("data", (chunk: Buffer) => console.log(`[Cloudflare Tunnel] ${chunk.toString().trimEnd()}`));
  tunnelProcess.stderr?.on("data", (chunk: Buffer) => console.error(`[Cloudflare Tunnel] ${chunk.toString().trimEnd()}`));
}

async function waitForHttp(url: string, timeoutMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) return true;
    } catch {
      // Le serveur n'est pas encore prêt.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/** Démarre l'API et le portail web si ce poste est configuré comme serveur du campus. */
export async function startCampusServicesIfNeeded(isServerHost: boolean): Promise<void> {
  if (!isServerHost) return;

  const paths = resolveCampusServicePaths();
  if (!paths) {
    console.warn(
      "[campus-services] Bundle serveur introuvable — exécutez `pnpm prepare:server-bundle` avant de construire l'installeur, ou `pnpm build` sur api et web-portail en développement."
    );
    return;
  }

  const serverEnv = loadServerEnv();
  const apiPort = serverEnv.PORT ?? String(DEFAULT_LOCAL_API_PORT);
  const portalPort = serverEnv.PORTAL_PORT ?? String(DEFAULT_LOCAL_PORTAL_PORT);

  if (!apiProcess || apiProcess.exitCode !== null) {
    apiProcess = spawnNodeScript("API", paths.apiEntry, paths.apiCwd, { ...serverEnv, PORT: apiPort });
  }

  if (!portalProcess || portalProcess.exitCode !== null) {
    portalProcess = spawnNodeScript(
      "Portail",
      paths.portalNextBin,
      paths.portalCwd,
      { ...serverEnv, PORT: portalPort },
      ["start", "-p", portalPort, "-H", "0.0.0.0"]
    );
  }

  const apiReady = await waitForHttp(`http://127.0.0.1:${apiPort}/`);
  if (!apiReady) {
    console.warn(`[campus-services] L'API n'a pas répondu à temps sur le port ${apiPort}.`);
  }
  if (apiReady) startCloudflareTunnel(serverEnv);

  const portalReady = await waitForHttp(`http://127.0.0.1:${portalPort}/`);
  if (!portalReady) {
    console.warn(`[campus-services] Le portail n'a pas répondu à temps sur le port ${portalPort}.`);
  }
}

/** Arrête proprement les services lancés par l'application. */
export function stopCampusServices(): void {
  for (const proc of [apiProcess, portalProcess, tunnelProcess]) {
    if (proc && proc.exitCode === null) {
      proc.kill();
    }
  }
  apiProcess = null;
  portalProcess = null;
  tunnelProcess = null;
}
