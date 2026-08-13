import { Button, Input, Label, Select } from "@isac-erp/ui";
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
 * Contrats de travail — enseignant (2026-08-06, retour du porteur du projet) : deux types possibles,
 * CDD par module d'enseignement (recrutement direct, sans période d'essai, renouvelable module par
 * module) ou contrat de vacation (engagement plus léger, sans lien de subordination permanent). Même
 * principe que TeacherEmargementTab.tsx : chaque génération crée un nouveau document archivé.
 */
export function TeacherContractsTab({ teacherId }: { teacherId: string }) {
  const canView = useHasPermission("DOCUMENTS:LECTURE");
  const canGenerate = useHasPermission("DOCUMENTS:CREATION");

  const [contractType, setContractType] = useState<"CONTRAT_CDD_ENSEIGNANT" | "CONTRAT_VACATION">("CONTRAT_CDD_ENSEIGNANT");

  const [representantLegalNom, setRepresentantLegalNom] = useState("");
  const [representantLegalFonction, setRepresentantLegalFonction] = useState("");
  const [lieuSignature, setLieuSignature] = useState("Conakry");
  const [dateSignature, setDateSignature] = useState("");

  const [intituleModule, setIntituleModule] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [tauxHoraire, setTauxHoraire] = useState("");

  const [academicYearId, setAcademicYearId] = useState("");
  const [volumeHoraireMensuel, setVolumeHoraireMensuel] = useState("15");

  const yearsQuery = trpc.academicYears.list.useQuery();
  const activeYearId = yearsQuery.data?.find((y) => y.isActive)?.id ?? "";
  const effectiveYearId = academicYearId || activeYearId;

  const utils = trpc.useUtils();
  const cddQuery = trpc.documents.list.useQuery({ documentType: "CONTRAT_CDD_ENSEIGNANT", relatedEntityId: teacherId });
  const vacationQuery = trpc.documents.list.useQuery({ documentType: "CONTRAT_VACATION", relatedEntityId: teacherId });
  const generate = trpc.documents.generate.useMutation({
    onSuccess: () => {
      void utils.documents.list.invalidate({ documentType: "CONTRAT_CDD_ENSEIGNANT", relatedEntityId: teacherId });
      void utils.documents.list.invalidate({ documentType: "CONTRAT_VACATION", relatedEntityId: teacherId });
    },
  });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  const documents = [...(cddQuery.data ?? []), ...(vacationQuery.data ?? [])].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
  const latest = documents[0];

  const commonValid = Boolean(representantLegalNom && representantLegalFonction && lieuSignature && dateSignature);
  const cddValid = commonValid && Boolean(intituleModule && dateDebut && dateFin) && Number(tauxHoraire) > 0;
  const vacationValid = commonValid && Boolean(effectiveYearId) && Number(volumeHoraireMensuel) > 0 && Number(tauxHoraire) > 0;
  const canSubmit = contractType === "CONTRAT_CDD_ENSEIGNANT" ? cddValid : vacationValid;

  function handleGenerate() {
    if (contractType === "CONTRAT_CDD_ENSEIGNANT") {
      generate.mutate({
        documentType: "CONTRAT_CDD_ENSEIGNANT",
        teacherId,
        intituleModule,
        dateDebut: toIsoDate(dateDebut),
        dateFin: toIsoDate(dateFin),
        tauxHoraire: Number(tauxHoraire),
        representantLegalNom,
        representantLegalFonction,
        lieuSignature,
        dateSignature: toIsoDate(dateSignature),
      });
    } else {
      generate.mutate({
        documentType: "CONTRAT_VACATION",
        teacherId,
        academicYearId: effectiveYearId,
        volumeHoraireMensuel: Number(volumeHoraireMensuel),
        tauxHoraire: Number(tauxHoraire),
        representantLegalNom,
        representantLegalFonction,
        lieuSignature,
        dateSignature: toIsoDate(dateSignature),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canGenerate && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex flex-col gap-1.5">
            <Label>Type de contrat</Label>
            <Select value={contractType} onChange={(e) => setContractType(e.target.value as typeof contractType)}>
              <option value="CONTRAT_CDD_ENSEIGNANT">CDD — par module d'enseignement</option>
              <option value="CONTRAT_VACATION">Contrat de vacation</option>
            </Select>
          </div>

          {contractType === "CONTRAT_CDD_ENSEIGNANT" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-4">
                <Label>Intitulé du module</Label>
                <Input value={intituleModule} onChange={(e) => setIntituleModule(e.target.value)} placeholder="Ex. Comptabilité générale S1" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Date de début</Label>
                <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Date de fin</Label>
                <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Taux horaire (GNF)</Label>
                <Input type="number" min={0} value={tauxHoraire} onChange={(e) => setTauxHoraire(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>Année scolaire</Label>
                <Select value={effectiveYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
                  <option value="">—</option>
                  {(yearsQuery.data ?? []).map((y) => (
                    <option key={y.id} value={y.id}>{y.label}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Volume horaire mensuel prévisionnel</Label>
                <Input type="number" min={0} value={volumeHoraireMensuel} onChange={(e) => setVolumeHoraireMensuel(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Taux horaire (GNF)</Label>
                <Input type="number" min={0} value={tauxHoraire} onChange={(e) => setTauxHoraire(e.target.value)} />
              </div>
            </div>
          )}

          <p className="text-sm font-medium">Signature</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            <Button disabled={!canSubmit || generate.isPending} onClick={handleGenerate}>
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
