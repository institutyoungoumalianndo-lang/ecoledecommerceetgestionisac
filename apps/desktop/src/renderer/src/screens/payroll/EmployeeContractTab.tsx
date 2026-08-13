import { Button, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR");
}

function toIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

/**
 * Contrat de travail — personnel administratif (2026-08-06, retour du porteur du projet) : CDD à
 * durée d'une année scolaire, pour les postes à responsabilité à salaire fixe. Même principe que
 * TeacherEmargementTab.tsx : chaque génération crée un nouveau document archivé.
 */
export function EmployeeContractTab({ employeeId }: { employeeId: string }) {
  const canView = useHasPermission("DOCUMENTS:LECTURE");
  const canGenerate = useHasPermission("DOCUMENTS:CREATION");

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [representantLegalNom, setRepresentantLegalNom] = useState("");
  const [representantLegalFonction, setRepresentantLegalFonction] = useState("");
  const [lieuSignature, setLieuSignature] = useState("Conakry");
  const [dateSignature, setDateSignature] = useState("");

  const utils = trpc.useUtils();
  const query = trpc.documents.list.useQuery({ documentType: "CONTRAT_CDD_ADMINISTRATIF", relatedEntityId: employeeId });
  const generate = trpc.documents.generate.useMutation({
    onSuccess: () => void utils.documents.list.invalidate({ documentType: "CONTRAT_CDD_ADMINISTRATIF", relatedEntityId: employeeId }),
  });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  const documents = [...(query.data ?? [])].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  const latest = documents[0];
  const canSubmit = Boolean(dateDebut && dateFin && representantLegalNom && representantLegalFonction && lieuSignature && dateSignature);

  return (
    <div className="flex flex-col gap-4">
      {canGenerate && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Générer le contrat (CDD — année scolaire)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Date de début</Label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date de fin</Label>
              <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Représentant légal (nom)</Label>
              <Input value={representantLegalNom} onChange={(e) => setRepresentantLegalNom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fonction du représentant</Label>
              <Input value={representantLegalFonction} onChange={(e) => setRepresentantLegalFonction(e.target.value)} placeholder="Ex. Directeur Général" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Lieu de signature</Label>
              <Input value={lieuSignature} onChange={(e) => setLieuSignature(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date de signature</Label>
              <Input type="date" value={dateSignature} onChange={(e) => setDateSignature(e.target.value)} />
            </div>
          </div>
          {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}
          <div className="flex justify-end">
            <Button
              disabled={!canSubmit || generate.isPending}
              onClick={() =>
                generate.mutate({
                  documentType: "CONTRAT_CDD_ADMINISTRATIF",
                  employeeId,
                  dateDebut: toIsoDate(dateDebut),
                  dateFin: toIsoDate(dateFin),
                  representantLegalNom,
                  representantLegalFonction,
                  lieuSignature,
                  dateSignature: toIsoDate(dateSignature),
                })
              }
            >
              {generate.isPending ? "Génération…" : "Générer le contrat"}
            </Button>
          </div>
        </div>
      )}

      {latest && (
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Dernier contrat généré — n° {latest.documentNumber}</p>
            <p className="text-xs text-muted-foreground">Généré le {formatDate(latest.generatedAt)}</p>
          </div>
          <a href={resolveUploadUrl(latest.filePath) ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Voir le PDF
          </a>
        </div>
      )}

      {documents.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Historique</p>
          <div className="flex flex-col gap-2">
            {documents.slice(1).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <p className="text-sm">
                  N° {d.documentNumber} — {formatDate(d.generatedAt)}
                </p>
                <a href={resolveUploadUrl(d.filePath) ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  Voir
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
