import type { StudentDocumentType } from "@isac-erp/shared";
import { Card, CardContent, CardHeader, CardTitle, Checkbox, Label } from "@isac-erp/ui";
import { trpc } from "../../lib/trpc";

const DOCUMENT_TYPE_LABELS: Record<StudentDocumentType, string> = {
  ACTE_NAISSANCE: "Acte de naissance",
  DIPLOME: "Diplôme",
  RELEVE: "Relevés",
  PHOTO: "Photo",
  CARTE_IDENTITE_PASSEPORT: "Carte d'identité / Passeport",
  CERTIFICAT_MEDICAL: "Certificat médical",
  AUTRE: "Autre",
};

/** Contrôle de capacité et documents obligatoires (MODULE-04.1 §1.5/§2.4) — désactivés par défaut. */
export function EnrollmentSettingsScreen() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.enrollmentSettings.get.useQuery();
  const requirementsQuery = trpc.enrollmentSettings.listDocumentRequirements.useQuery();

  const updateSettings = trpc.enrollmentSettings.update.useMutation({
    onSuccess: () => void utils.enrollmentSettings.get.invalidate(),
  });
  const setRequirement = trpc.enrollmentSettings.setDocumentRequirement.useMutation({
    onSuccess: () => void utils.enrollmentSettings.listDocumentRequirements.invalidate(),
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Capacité des classes</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Checkbox
            checked={settingsQuery.data?.enforceClassCapacity ?? false}
            disabled={!settingsQuery.data}
            onChange={(e) => updateSettings.mutate({ enforceClassCapacity: e.target.checked })}
          />
          <Label>
            Bloquer une nouvelle inscription si la classe a atteint sa capacité maximale
          </Label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents obligatoires</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Une inscription sera bloquée si l'un des documents cochés manque au dossier de l'étudiant.
          </p>
          {(requirementsQuery.data ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <Checkbox
                checked={r.isRequired}
                onChange={(e) =>
                  setRequirement.mutate({ documentType: r.documentType, isRequired: e.target.checked })
                }
              />
              <Label>{DOCUMENT_TYPE_LABELS[r.documentType]}</Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
