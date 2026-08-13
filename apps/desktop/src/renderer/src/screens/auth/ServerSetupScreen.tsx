import { Button, Card, CardContent, CardHeader, FormField, Input } from "@isac-erp/ui";
import { DEFAULT_LOCAL_API_PORT } from "@isac-erp/shared";
import { Server } from "lucide-react";
import { useState } from "react";
import { normalizeServerOrigin } from "../../lib/trpc";

type TestState = { status: "idle" | "testing" | "ok" | "error"; message?: string };

/**
 * Premier écran affiché sur un poste neuf, avant même la connexion (ADR-007) — demande l'adresse du
 * serveur LAN du campus (backend + PostgreSQL, généralement le poste de la direction) et la persiste
 * localement sur ce poste via `window.isacErp.config` (voir apps/desktop/src/main/index.ts). Chaque
 * poste ne configure cette adresse qu'une seule fois ; modifiable ensuite depuis l'écran de connexion
 * ("Changer de serveur").
 */
export function ServerSetupScreen({ onSaved }: { onSaved: () => void }) {
  const [address, setAddress] = useState("");
  const [isServerHost, setIsServerHost] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const [saving, setSaving] = useState(false);

  const effectiveAddress = isServerHost ? `localhost:${DEFAULT_LOCAL_API_PORT}` : address.trim();

  async function handleTest() {
    if (!effectiveAddress) return;
    setTest({ status: "testing" });
    try {
      const response = await fetch(normalizeServerOrigin(effectiveAddress), { method: "GET" });
      if (!response.ok) throw new Error();
      const body: unknown = await response.json();
      const ok = typeof body === "object" && body !== null && (body as { status?: string }).status === "running";
      setTest(
        ok
          ? { status: "ok", message: "Serveur joignable." }
          : { status: "error", message: "Cette adresse répond, mais pas comme un serveur ISAC ERP." }
      );
    } catch {
      setTest({ status: "error", message: "Serveur injoignable à cette adresse — vérifiez le réseau et l'adresse saisie." });
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await window.isacErp.config.setServerUrl(effectiveAddress, isServerHost);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Server className="mb-2" size={32} />
          <h1 className="text-lg font-semibold">Adresse du serveur</h1>
          <p className="text-sm text-muted-foreground">
            Indiquez l'adresse réseau du serveur de ce campus (généralement le poste de la direction),
            fournie par votre Super Administrateur.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isServerHost) void handleTest();
            }}
          >
            <FormField label="Adresse du serveur" required={!isServerHost}>
              <Input
                autoFocus={!isServerHost}
                placeholder="ex. 192.168.1.10:4310"
                value={isServerHost ? `localhost:${DEFAULT_LOCAL_API_PORT}` : address}
                disabled={isServerHost}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setTest({ status: "idle" });
                }}
              />
            </FormField>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={isServerHost}
                onChange={(e) => {
                  setIsServerHost(e.target.checked);
                  setTest({ status: "idle" });
                }}
              />
              <span>
                <span className="font-medium">Ce poste héberge le serveur du campus</span>
                <span className="mt-1 block text-muted-foreground">
                  L'API (port {DEFAULT_LOCAL_API_PORT}) et le portail web démarrent automatiquement à
                  chaque ouverture de l'application. PostgreSQL doit déjà être installé et configuré
                  via le fichier <code className="text-xs">%APPDATA%\ISAC ERP\server.env</code>.
                </span>
              </span>
            </label>

            {isServerHost ? (
              <p className="text-sm text-muted-foreground">
                En mode serveur, l'API et le portail web démarrent automatiquement après
                enregistrement — aucun test préalable n'est nécessaire.
              </p>
            ) : (
              test.status !== "idle" && (
                <p className={`text-sm ${test.status === "ok" ? "text-success" : test.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                  {test.status === "testing" ? "Test en cours…" : test.message}
                </p>
              )
            )}

            {!isServerHost && (
              <Button type="submit" variant="outline" disabled={!effectiveAddress || test.status === "testing"}>
                Tester la connexion
              </Button>
            )}
            <Button
              type="button"
              disabled={(isServerHost ? false : test.status !== "ok") || saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Enregistrement…" : "Enregistrer et continuer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
