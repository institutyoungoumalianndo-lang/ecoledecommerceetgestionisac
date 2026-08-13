import type { TeacherPayrollStatusDto } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, DataTable, type DataTableColumn } from "@isac-erp/ui";
import { trpc } from "../../lib/trpc";

/**
 * Pont Enseignant → Paie (extension du 2026-07-30, retour du porteur du projet) : jusqu'ici, la
 * paie ne "voyait" que les enseignants pour lesquels un Employé avait déjà été créé — un enseignant
 * affecté à des matières mais sans Employé restait invisible dans "Calculer tous les bulletins",
 * sans aucun écran pour repérer ce cas. Part de TeacherAssignment (le référentiel réel "qui
 * enseigne quoi") sur l'année universitaire active, pour ne rater aucun enseignant affecté.
 */
export function TeachersPayrollStatusScreen({
  onCreatePayrollProfile,
}: {
  onCreatePayrollProfile: (teacherId: string) => void;
}) {
  const query = trpc.employees.listTeachersPayrollStatus.useQuery({});
  const activeYearQuery = trpc.academicYears.list.useQuery();
  const activeYear = activeYearQuery.data?.find((y) => y.isActive);

  const missing = (query.data ?? []).filter((t) => !t.hasPayrollProfile);
  const covered = (query.data ?? []).filter((t) => t.hasPayrollProfile);

  const columns: DataTableColumn<TeacherPayrollStatusDto>[] = [
    { key: "matricule", header: "Matricule", value: (t) => t.matricule },
    { key: "nom", header: "Nom", value: (t) => `${t.lastName} ${t.firstName}` },
    { key: "matieres", header: "Matières affectées", value: (t) => t.subjectCount },
    {
      key: "statut",
      header: "Profil de paie",
      value: (t) => (t.hasPayrollProfile ? "Créé" : "Manquant"),
      render: (t) => <Badge variant={t.hasPayrollProfile ? "success" : "warning"}>{t.hasPayrollProfile ? "Créé" : "Manquant"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Tous les enseignants ayant au moins une matière affectée sur l'année universitaire
          {activeYear ? ` ${activeYear.label}` : " en cours"} — y compris ceux pour qui aucun profil
          de paie (Employé) n'a encore été créé, et qui sont donc invisibles ailleurs dans la Paie.
        </CardContent>
      </Card>

      {missing.length > 0 && (
        <div className="rounded-lg border border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {missing.length} enseignant{missing.length > 1 ? "s" : ""} sans profil de paie — invisible
          {missing.length > 1 ? "s" : ""} dans le calcul des bulletins tant qu'aucun Employé ne leur est lié.
        </div>
      )}

      <DataTable
        columns={columns}
        rows={[...missing, ...covered]}
        getRowId={(t) => t.teacherId}
        exportFilename="enseignants-statut-paie"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun enseignant affecté sur cette année universitaire."}
        rowActions={(t) =>
          !t.hasPayrollProfile ? (
            <Button variant="outline" onClick={() => onCreatePayrollProfile(t.teacherId)}>
              Créer le profil de paie
            </Button>
          ) : null
        }
      />
    </div>
  );
}
