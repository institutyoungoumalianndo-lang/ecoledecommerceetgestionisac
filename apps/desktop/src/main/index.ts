import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { DEFAULT_LOCAL_API_PORT } from "@isac-erp/shared";
import { startCampusServicesIfNeeded, stopCampusServices } from "./campusServices.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Nom stable visible par l'utilisateur. Il ne dépend pas du nom technique
// du package npm, afin que la configuration reste dans %APPDATA%\ISAC ERP.
const USER_DATA_FOLDER = "ISAC ERP";

function configureUserDataPath(): void {
  app.setPath("userData", join(app.getPath("appData"), USER_DATA_FOLDER));
}

async function migrateLegacyUserData(): Promise<void> {
  const target = app.getPath("userData");
  const legacy = join(app.getPath("appData"), "@isac-erp", "desktop");
  await mkdir(target, { recursive: true });

  for (const filename of ["config.json", "server.env"]) {
    const destination = join(target, filename);
    try {
      await access(destination, fsConstants.F_OK);
      continue;
    } catch {
      // Le fichier cible n'existe pas encore : migration éventuelle ci-dessous.
    }
    try {
      await copyFile(join(legacy, filename), destination);
    } catch {
      // Rien à migrer sur une première installation.
    }
  }
}

configureUserDataPath();

/**
 * Configuration locale du poste (ADR-007) — adresse du serveur LAN et mode hôte serveur.
 * Stockée en dehors de la base applicative : c'est l'information qui permet de la joindre.
 */
interface LocalConfig {
  serverUrl?: string;
  /** Si true, ce poste démarre automatiquement l'API et le portail web à l'ouverture. */
  isServerHost?: boolean;
}

function getConfigPath(): string {
  return join(app.getPath("userData"), "config.json");
}

async function readConfig(): Promise<LocalConfig> {
  try {
    const raw = await readFile(getConfigPath(), "utf-8");
    return JSON.parse(raw) as LocalConfig;
  } catch {
    return {};
  }
}

async function writeConfig(config: LocalConfig): Promise<void> {
  await writeFile(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}

async function ensureServerEnvTemplate(): Promise<void> {
  const serverEnvPath = join(app.getPath("userData"), "server.env");
  try {
    await access(serverEnvPath, fsConstants.F_OK);
    return;
  } catch {
    // Fichier absent — on le crée à partir de l'exemple livré avec l'installeur ou du monorepo.
  }

  const candidates = [
    join(process.resourcesPath, "campus-server", "server.env.example"),
    join(fileURLToPath(new URL(".", import.meta.url)), "../../../../resources/campus-server/server.env.example"),
    join(fileURLToPath(new URL(".", import.meta.url)), "../../../../infra/windows/server.env.example"),
  ];

  for (const source of candidates) {
    try {
      await access(source, fsConstants.F_OK);
      await copyFile(source, serverEnvPath);
      return;
    } catch {
      // Essayer la source suivante.
    }
  }

  await writeFile(
    serverEnvPath,
    `DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/isac_erp?schema=public"\nPORT=4310\nPORTAL_PORT=3000\n# Jeton d'un tunnel Cloudflare permanent (facultatif) :\n# CLOUDFLARE_TUNNEL_TOKEN=collez_ici_le_jeton\n`,
    "utf-8"
  );
}

ipcMain.handle("config:get-server-url", async () => {
  const config = await readConfig();
  return config.serverUrl ?? null;
});

ipcMain.handle("config:set-server-url", async (_event, serverUrl: string, isServerHost?: boolean) => {
  const current = await readConfig();
  const nextIsServerHost = isServerHost ?? current.isServerHost ?? false;
  if (nextIsServerHost) {
    await ensureServerEnvTemplate();
  }
  await writeConfig({
    ...current,
    serverUrl,
    isServerHost: nextIsServerHost,
  });
});

ipcMain.handle("config:get-is-server-host", async () => {
  const config = await readConfig();
  return config.isServerHost ?? false;
});

ipcMain.handle("config:clear-server-url", async () => {
  await writeConfig({});
});

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: "ISAC ERP",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const devServerUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devServerUrl) {
    void win.loadURL(devServerUrl);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

void app.whenReady().then(async () => {
  await migrateLegacyUserData();
  const config = await readConfig();
  const isServerHost = config.isServerHost ?? false;

  if (isServerHost && !config.serverUrl) {
    await writeConfig({ ...config, serverUrl: `localhost:${DEFAULT_LOCAL_API_PORT}`, isServerHost: true });
  }

  await startCampusServicesIfNeeded(isServerHost);
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("before-quit", () => {
  stopCampusServices();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
