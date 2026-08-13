import type { FeeReductionType, FeeReductionValueMode } from "@isac-erp/shared";
import { Badge, Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const TYPE_LABELS: Record<FeeReductionType, string> = {
  BOURSE: "Bourse",
  REMISE: "Remise",
  EXONERATION_PARTIELLE: "Exonération partielle",
  EXONERATION_TOTALE: "Exonération totale",
  EXCEPTIONNELLE: "Réduction exceptionnelle",
};

/** Réductions et exonérations (MODULE-04.2 §6.5) — recherche par étudiant. */
export function FeeReductionsScreen() {
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentLabel, setSelectedStudentLabel] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = useHasPermission("FRAIS_REDUCTIONS:CREATION");
  const canEnd = useHasPermission("FRAIS_REDUCTIONS:SUPPRESSION");

  const searchQuery = trpc.students.list.useQuery(
    { search, includeArchived: false, sortBy: "lastName", sortDirection: "asc", page: 1, pageSize: 10 },
    { enabled: search.trim().length > 0 }
  );

  const utils = trpc.useUtils();
  const reductionsQuery = trpc.feeReductions.list.useQuery(
    { studentId: selectedStudentId ?? undefined },
    { enabled: Boolean(selectedStudentId) }
  );
  const endReduction = trpc.feeReductions.end.useMutation({
    onSuccess: () => void utils.feeReductions.list.invalidate(),
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Réductions et exonérations</h2>

      <div className="flex flex-col gap-1.5 max-w-md">
        <Label>Rechercher un étudiant (matricule, nom, prénom)</Label>
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedStudentId(null);
          }}
        />
        {searchQuery.data && searchQuery.data.rows.length > 0 && !selectedStudentId && (
          <ul className="flex flex-col gap-1 rounded-md border border-border p-1">
            {searchQuery.data.rows.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setSelectedStudentId(s.id);
                    setSelectedStudentLabel(`${s.matricule} — ${s.lastName} ${s.firstName}`);
                  }}
                >
                  {s.matricule} — {s.lastName} {s.firstName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedStudentId && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm">Étudiant : <strong>{selectedStudentLabel}</strong></p>
            {canCreate && <Button onClick={() => setCreateOpen(true)}>Nouvelle réduction</Button>}
          </div>

          <div className="flex flex-col gap-2">
            {(reductionsQuery.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune réduction enregistrée.</p>
            )}
            {(reductionsQuery.data ?? []).map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant={r.isExpired ? "muted" : "success"}>{TYPE_LABELS[r.type]}</Badge>{" "}
                    <span className="font-medium">
                      {r.valueMode === "POURCENTAGE" ? `${r.value}%` : `${r.value.toLocaleString("fr-FR")}`}
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">
                      {r.feeTypeName ? `sur ${r.feeTypeName}` : "sur tous les frais"} — {r.academicYearLabel}
                    </span>
                  </div>
                  {canEnd && !r.isExpired && (
                    <Button variant="destructive" onClick={() => endReduction.mutate({ id: r.id })}>
                      Mettre fin
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Motif : {r.reason} — Accordé par : {r.grantedByAuthority}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {createOpen && selectedStudentId && (
        <CreateReductionDialog studentId={selectedStudentId} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}

function CreateReductionDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [feeTypeId, setFeeTypeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [type, setType] = useState<FeeReductionType>("BOURSE");
  const [valueMode, setValueMode] = useState<FeeReductionValueMode>("POURCENTAGE");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [grantedByAuthority, setGrantedByAuthority] = useState("");
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState("");

  const feeTypesQuery = trpc.feeTypes.list.useQuery();
  const yearsQuery = trpc.academicYears.list.useQuery();

  const create = trpc.feeReductions.create.useMutation({
    onSuccess: () => {
      void utils.feeReductions.list.invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nouvelle réduction / exonération">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as FeeReductionType)}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Année universitaire</Label>
            <Select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
              <option value="">—</option>
              {(yearsQuery.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type de frais concerné (vide = tous)</Label>
            <Select value={feeTypeId} onChange={(e) => setFeeTypeId(e.target.value)}>
              <option value="">Tous les frais</option>
              {(feeTypesQuery.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Mode</Label>
            <Select value={valueMode} onChange={(e) => setValueMode(e.target.value as FeeReductionValueMode)}>
              <option value="POURCENTAGE">Pourcentage</option>
              <option value="MONTANT">Montant fixe</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Valeur</Label>
            <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Autorité ayant accordé</Label>
            <Input value={grantedByAuthority} onChange={(e) => setGrantedByAuthority(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Valide à partir du</Label>
            <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Valide jusqu'au (optionnel)</Label>
            <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Motif</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!academicYearId || !value || !reason.trim() || !grantedByAuthority.trim() || create.isPending}
            onClick={() =>
              create.mutate({
                studentId,
                feeTypeId: feeTypeId || undefined,
                academicYearId,
                type,
                valueMode,
                value: Number(value),
                reason,
                grantedByAuthority,
                validFrom: new Date(validFrom),
                validTo: validTo ? new Date(validTo) : undefined,
              })
            }
          >
            {create.isPending ? "Enregistrement…" : "Accorder"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
