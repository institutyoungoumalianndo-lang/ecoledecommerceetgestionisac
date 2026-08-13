/// <reference types="vite/client" />

interface Window {
  isacErp: {
    versions: { app: string; electron: string; chrome: string; node: string };
    platform: NodeJS.Platform;
    config: {
      getServerUrl: () => Promise<string | null>;
      getIsServerHost: () => Promise<boolean>;
      setServerUrl: (serverUrl: string, isServerHost?: boolean) => Promise<void>;
      clearServerUrl: () => Promise<void>;
    };
  };
}
