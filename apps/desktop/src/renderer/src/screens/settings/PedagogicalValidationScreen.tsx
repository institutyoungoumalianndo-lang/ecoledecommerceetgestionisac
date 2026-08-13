import { Badge, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

const ISSUE_LABELS: Record<string, string> = {
  MATIERE_OBLIGATOIRE_MANQUANTE: "Matière obligatoire manquante",
  VOLUME_HORAIRE_INCOHERENT: "Volume horaire incohérent",
  COEFFICIENT_MANQUANT: "Coefficient manquant",
};

/** Validation pédagogique (MODULE-02.1 §1.5/§9.11) — diagnostic informatif, ne bloque aucune opération. */
export function PedagogicalValidationScreen() {
  const [classId, setClassId] = useState("");
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const diagnosticQuery = trpc.pedagogicalValidation.validateClass.useQuery({ classId }, { enabled: Boolean(classId) });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Validation pédagogique</h2>
      <div className="flex flex-col gap-1.5 max-w-sm">
        <Label>Classe</Label>
        <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">— Sélectionner une classe —</option>
          {(classesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      {diagnosticQuery.data && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {diagnosticQuery.data.filiereName} / {diagnosticQuery.data.levelName} — {diagnosticQuery.data.academicYearLabel}
          </p>
          {diagnosticQuery.data.isValid ? (
            <Badge variant="success">Aucune anomalie détectée.</Badge>
          ) : (
            <div className="flex flex-col gap-2">
              {diagnosticQuery.data.issues.map((issue, index) => (
                <div key={index} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 even:bg-primary/5">
                  <Badge variant="destructive">{ISSUE_LABELS[issue.type] ?? issue.type}</Badge>
                  <span className="text-sm">
                    <strong>{issue.periodLabel}</strong> — {issue.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
