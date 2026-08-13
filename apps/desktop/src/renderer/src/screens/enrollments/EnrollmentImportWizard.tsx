import type { EnrollmentImportRowInput, ValidateEnrollmentImportOutput } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, FormField, Label, Select, parseSpreadsheetFile } from "@isac-erp/ui";
import { type ChangeEvent, useState } from "react";
import { trpc } from "../../lib/trpc";

type MappingField = keyof Omit<EnrollmentImportRowInput, "rowNumber">;

const MAPPING_FIELDS: { key: MappingField; label: string; required: boolean }[] = [
  { key: "matricule", label: "Matricule", required: true },
  { key: "classCode", label: "Code classe (si différent de la classe cible)", required: false },
  { key: "regimeCode", label: "Code régime", required: false },
  { key: "status", label: "Statut (nouveau/ancien/redoublant/transfert/reprise)", required: false },
];

const AUTO_MATCH: Record<MappingField, string[]> = {
  matricule: ["matricule"],
  classCode: ["classe", "code classe"],
  regimeCode: ["régime", "regime", "code régime"],
  status: ["statut"],
};

/** Import en masse d'inscriptions/réinscriptions (MODULE-04.1 §5.11) — 3 étapes, même schéma que l'import d'étudiants. */
export function EnrollmentImportWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [targetClassId, setTargetClassId] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<MappingField, string>>>({});
  const [validation, setValidation] = useState<ValidateEnrollmentImportOutput | null>(null);
  const [executeResult, setExecuteResult] = useState<{ importedCount: number; failedRows: { rowNumber: number; error: string }[] } | null>(null);

  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const validate = trpc.enrollmentImport.validate.useMutation();
  const execute = trpc.enrollmentImport.execute.useMutation();

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = await parseSpreadsheetFile(file);
    const detectedHeaders = rows.length > 0 ? Object.keys(rows[0]!) : [];
    setHeaders(detectedHeaders);
    setRawRows(rows);

    const autoMapping: Partial<Record<MappingField, string>> = {};
    for (const field of MAPPING_FIELDS) {
      const match = detectedHeaders.find((h) => AUTO_MATCH[field.key].includes(h.trim().toLowerCase()));
      if (match) autoMapping[field.key] = match;
    }
    setMapping(autoMapping);
  }

  function buildRows(): EnrollmentImportRowInput[] {
    return rawRows.map((row, index) => ({
      rowNumber: index + 2,
      matricule: mapping.matricule ? row[mapping.matricule] ?? "" : "",
      classCode: mapping.classCode ? row[mapping.classCode] : undefined,
      regimeCode: mapping.regimeCode ? row[mapping.regimeCode] : undefined,
      status: mapping.status ? row[mapping.status] : undefined,
    }));
  }

  async function handleValidate() {
    const result = await validate.mutateAsync({ targetClassId, rows: buildRows() });
    setValidation(result);
    setStep(3);
  }

  async function handleExecute() {
    if (!validation) return;
    const validRows = validation.results.filter((r) => r.isValid && r.data);
    const result = await execute.mutateAsync({
      rows: validRows.map((r) => ({ rowNumber: r.rowNumber, data: r.data! })),
    });
    setExecuteResult(result);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border window-surface text-window-foreground shadow-lg">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">Import d'inscriptions — étape {step}/3</h2>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <FormField label="Classe cible" hint='Par défaut, sauf colonne "Code classe" mappée'>
                <Select value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)}>
                  <option value="">—</option>
                  {(classesQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Fichier (Excel ou CSV)" required>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => void handleFileChange(e)} />
              </FormField>
              {rawRows.length > 0 && (
                <p className="text-sm text-muted-foreground">{rawRows.length} ligne(s) détectée(s).</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Associez chaque champ à une colonne du fichier importé. Les étudiants sont recherchés par matricule
                (déjà existants — pour un nouvel étudiant, utilisez l'import du module Étudiants).
              </p>
              {MAPPING_FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-2 items-center gap-3">
                  <Label>
                    {field.label}
                    {field.required && " *"}
                  </Label>
                  <Select
                    value={mapping[field.key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value || undefined }))}
                  >
                    <option value="">—</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          )}

          {step === 3 && !executeResult && validation && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 text-sm">
                <Badge variant="success">{validation.validCount} valides</Badge>
                <Badge variant="destructive">{validation.errorCount} en erreur</Badge>
                <Badge variant="muted">{validation.warningCount} avertissements</Badge>
              </div>
              <div className="max-h-96 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left text-secondary-foreground">Ligne</th>
                      <th className="px-3 py-2 text-left text-secondary-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.results.map((r) => (
                      <tr key={r.rowNumber} className="border-t border-border">
                        <td className="px-3 py-2">{r.rowNumber}</td>
                        <td className="px-3 py-2">
                          {r.errors.length > 0 && <span className="text-destructive">{r.errors.join(" ")}</span>}
                          {r.errors.length === 0 && r.duplicateWarnings.length > 0 && (
                            <span className="text-muted-foreground">{r.duplicateWarnings.join(" ")}</span>
                          )}
                          {r.errors.length === 0 && r.duplicateWarnings.length === 0 && (
                            <span className="text-success">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {executeResult && (
            <Card variant="form">
              <CardHeader>
                <CardTitle>Import terminé</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{executeResult.importedCount} inscription(s) créée(s).</p>
                {executeResult.failedRows.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-destructive">{executeResult.failedRows.length} ligne(s) en échec :</p>
                    <ul className="list-disc pl-5 text-sm text-destructive">
                      {executeResult.failedRows.map((f) => (
                        <li key={f.rowNumber}>Ligne {f.rowNumber} : {f.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between border-t border-border p-4">
          <div>
            {step > 1 && !executeResult && (
              <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                Précédent
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step === 1 && (
              <Button disabled={!targetClassId || rawRows.length === 0} onClick={() => setStep(2)}>
                Suivant
              </Button>
            )}
            {step === 2 && (
              <Button disabled={!mapping.matricule || validate.isPending} onClick={() => void handleValidate()}>
                {validate.isPending ? "Validation…" : "Valider les lignes"}
              </Button>
            )}
            {step === 3 && !executeResult && validation && (
              <Button disabled={validation.validCount === 0 || execute.isPending} onClick={() => void handleExecute()}>
                {execute.isPending ? "Import…" : `Importer ${validation.validCount} inscription(s)`}
              </Button>
            )}
            {executeResult && <Button onClick={onClose}>Terminer</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
