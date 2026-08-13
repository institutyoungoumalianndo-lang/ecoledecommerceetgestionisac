import { settingsExportSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@isac-erp/ui";
import { useRef, useState } from "react";
import { trpc } from "../../lib/trpc";

/**
 * Sauvegarde des paramètres (§3.17) : export/import du paramétrage
 * uniquement (JSON portable) — distinct d'une sauvegarde complète de base de
 * données, qui sera traitée au Module 11 (voir MODULE-02 §1.4.4).
 */
export function BackupScreen() {
  const utils = trpc.useUtils();
  const exportQuery = trpc.settingsBackup.export.useQuery(undefined, { enabled: false });
  const importMutation = trpc.settingsBackup.import.useMutation({
    onSuccess: () => {
      void utils.invalidate();
      setImportMessage("Configuration restaurée avec succès.");
    },
    onError: (error) => setImportMessage(`Échec de l'import : ${error.message}`),
  });
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `isac-erp-parametres-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    setImportMessage(null);
    try {
      const text = await file.text();
      const parsed = settingsExportSchema.parse(JSON.parse(text));
      if (window.confirm("Restaurer cette configuration remplacera les paramètres actuels. Continuer ?")) {
        importMutation.mutate({ data: parsed });
      }
    } catch {
      setImportMessage("Fichier invalide — ce n'est pas un export de paramètres ISAC ERP valide.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sauvegarde des paramètres</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Exporte ou restaure uniquement le paramétrage de l'établissement (établissement, campus,
          structure académique, thème, modèles de documents...). Pour une sauvegarde complète de la
          base de données, voir le module Sauvegarde (à venir).
        </p>
        <div className="flex gap-2">
          <Button onClick={() => void handleExport()} disabled={exportQuery.isFetching}>
            {exportQuery.isFetching ? "Export…" : "Exporter la configuration"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
            {importMutation.isPending ? "Import…" : "Importer / Restaurer"}
          </Button>
        </div>
        {importMessage && <p className="text-sm text-muted-foreground">{importMessage}</p>}
      </CardContent>
    </Card>
  );
}
