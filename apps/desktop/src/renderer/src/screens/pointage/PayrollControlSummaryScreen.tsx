import type { PayrollControlSummaryDto } from "@isac-erp/shared";
import { Badge, DataTable, type DataTableColumn, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/**
 * Écran récapitulatif avant génération de la paie (MODULE-05.1 §1.9, colonne "reportées" ajoutée
 * au MODULE-05.2 §1.14) — permet au responsable de contrôler séances/heures/montant par enseignant
 * avant de lancer le calcul de la période de paie.
 */
export function PayrollControlSummaryScreen() {
  const today = new Date();
  const [year, setYear] = useState(String(today.getFullYear()));
  const [month, setMonth] = useState(String(today.getMonth() + 1));

  const query = trpc.seances.getPayrollControlSummary.useQuery({
    year: Number(year),
    month: Number(month),
  });

  const columns: DataTableColumn<PayrollControlSummaryDto>[] = [
    { key: "matricule", header: "Matricule", value: (r) => r.teacherMatricule },
    { key: "nom", header: "Enseignant", value: (r) => r.teacherName },
    {
      key: "statut",
      header: "Fiche",
      value: (r) => (r.timesheetStatus === "CLOTUREE" ? "Clôturée" : r.timesheetStatus === "OUVERTE" ? "Ouverte" : "Aucune"),
      render: (r) => (
        <Badge variant={r.timesheetStatus === "CLOTUREE" ? "success" : "muted"}>
          {r.timesheetStatus === "CLOTUREE" ? "Clôturée" : r.timesheetStatus === "OUVERTE" ? "Ouverte" : "Aucune"}
        </Badge>
      ),
    },
    { key: "prevues", header: "Séances prévues", value: (r) => String(r.sessionsPlanned) },
    { key: "faites", header: "Séances effectuées", value: (r) => String(r.sessionsDone) },
    { key: "reportees", header: "Séances reportées", value: (r) => String(r.sessionsPostponed) },
    { key: "non-faites", header: "Séances non effectuées", value: (r) => String(r.sessionsNotDone) },
    { key: "heures-prevues", header: "Heures prévues", value: (r) => r.hoursPlanned.toFixed(1) },
    { key: "heures-faites", header: "Heures réalisées", value: (r) => r.hoursDone.toFixed(1) },
    {
      key: "montant",
      header: "Montant brut (heures)",
      value: (r) => (r.grossAmount !== null ? r.grossAmount.toLocaleString("fr-FR") : "—"),
    },
    { key: "observations", header: "Observations", value: (r) => r.observations.join(" ; ") || "—" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Contrôlez les séances et heures pointées de chaque enseignant avant de lancer le calcul définitif de la paie
        du mois — les corrections se font depuis la fiche de pointage de l'enseignant concerné.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Mois</label>
          <Select value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map((label, i) => (
              <option key={label} value={i + 1}>{label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Année</label>
          <Select value={year} onChange={(e) => setYear(e.target.value)}>
            {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.teacherId}
        exportFilename="controle-pointage-paie"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune fiche de pointage pour ce mois."}
      />
    </div>
  );
}
