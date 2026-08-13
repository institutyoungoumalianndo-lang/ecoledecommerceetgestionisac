import { contextBridge, ipcRenderer } from "electron";

/**
 * Pont explicite et minimal entre le renderer (sandboxé, sans accès Node) et
 * le processus principal. On n'expose que ce qui est nécessaire — jamais
 * `ipcRenderer` brut, pour garder le contrôle total des messages autorisés.
 *
 * S'enrichira au fil des modules (ex. accès fichiers locaux pour la
 * sauvegarde au Module 11) mais reste toujours une liste blanche explicite.
 */
/**
 * `process.env` n'est pas garanti disponible dans un preload sandboxé une fois l'application
 * empaquetée (contrairement au mode développement, lancé via pnpm/electron-vite, où la variable
 * `npm_package_version` existe dans l'environnement du processus) — un accès direct y jetait une
 * exception qui empêchait `contextBridge.exposeInMainWorld` de s'exécuter, laissant tout le pont
 * `window.isacErp` indéfini côté renderer (2026-08-10, retour du porteur du projet sur le premier
 * test réel de l'exécutable installé).
 */
function readAppVersion(): string {
  try {
    return process.env?.["npm_package_version"] ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const isacErpBridge = {
  versions: {
    app: readAppVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  platform: process.platform,
  /**
   * Adresse du serveur LAN du campus (ADR-007), configurée une fois par poste — voir main/index.ts.
   * Trois méthodes seulement (liste blanche explicite), jamais `ipcRenderer` brut exposé.
   */
  config: {
    getServerUrl: (): Promise<string | null> => ipcRenderer.invoke("config:get-server-url"),
    getIsServerHost: (): Promise<boolean> => ipcRenderer.invoke("config:get-is-server-host"),
    setServerUrl: (serverUrl: string, isServerHost?: boolean): Promise<void> =>
      ipcRenderer.invoke("config:set-server-url", serverUrl, isServerHost),
    clearServerUrl: (): Promise<void> => ipcRenderer.invoke("config:clear-server-url"),
  },
};

contextBridge.exposeInMainWorld("isacErp", isacErpBridge);

export type IsacErpBridge = typeof isacErpBridge;
