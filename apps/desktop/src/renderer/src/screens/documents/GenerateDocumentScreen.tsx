import type { DocumentType, GenerateDocumentInput } from "@isac-erp/shared";
import { TIER1_DOCUMENT_TYPES } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";

const TIER1_LABELS: Record<(typeof TIER1_DOCUMENT_TYPES)[number], string> = {
  CERTIFICAT_SCOLARITE: "Certificat de scolarité",
  ATTESTATION_INSCRIPTION: "Attestation d'inscription",
  CARTE_ETUDIANT: "Carte d'étudiant",
  ATTESTATION_TRAVAIL: "Attestation de travail",
  LISTE_ETUDIANTS: "Liste des étudiants",
  LISTE_ENSEIGNANTS: "Liste des enseignants",
  LISTE_CLASSES: "Liste des classes",
  FICHE_EMARGEMENT: "Fiche d'émargement",
  EMPLOI_DU_TEMPS: "Emploi du temps",
  HISTORIQUE_PAIEMENTS: "Historique des paiements",
  GRAND_LIVRE_CAISSE: "Grand livre de caisse",
  ETAT_RECETTES: "État des recettes",
  RAPPORT_CAISSE: "Rapport de caisse",
  JOURNAL_CAISSE: "Journal de caisse",
  SITUATION_CAISSE_JOURNALIERE: "Situation de caisse journalière",
  BILAN: "Bilan",
  FICHE_INSCRIPTION: "Fiche d'inscription",
  FICHE_INSCRIPTION_COMPLETEE: "Fiche d'inscription complétée",
  SANCTION: "Avis de sanction disciplinaire",
  RECU_PAIEMENT: "Reçu de paiement",
  BULLETIN_SALAIRE: "Bulletin de paie",
  FICHE_EMARGEMENT_ENSEIGNANT: "Fiche d'émargement mensuelle des enseignants",
  CONTRAT_CDD_ADMINISTRATIF: "Contrat à durée déterminée — Personnel administratif",
  CONTRAT_CDD_ENSEIGNANT: "Contrat à durée déterminée — Enseignant",
  CONTRAT_VACATION: "Contrat de vacation",
  RETARD_PAIEMENT: "Retards de paiement",
  SITUATION_FINANCIERE: "Situation financière",
};

const RAPPORT_CAISSE_PERIOD_LABELS: Record<"JOUR" | "MOIS" | "ANNEE", string> = {
  JOUR: "Journalier",
  MOIS: "Mensuel",
  ANNEE: "Annuel",
};

const BILAN_PERIOD_LABELS: Record<"MOIS" | "SEMESTRE" | "ANNEE", string> = {
  MOIS: "Mensuel",
  SEMESTRE: "Semestriel",
  ANNEE: "Annuel",
};

// La carte d'étudiant a son propre parcours dédié (MODULE-09.1 : fiche étudiant → onglet "Carte
// d'étudiant", ou Documents → "Cartes d'étudiant par lot") — retirée de ce sélecteur générique pour ne
// plus produire l'ancien archétype simplifié (2026-07-30, retour du porteur du projet).
// Le reçu de paiement et le bulletin de paie ont, de la même façon, leur propre parcours contextuel
// (ReceiptView/PayslipView, ouverts depuis un paiement ou un bulletin précis) — un sélecteur générique
// "type de document d'abord" n'a pas de sens ici, il n'existe pas de liste de paiements/bulletins dans
// ce formulaire (migration du 2026-07-30, voir CHANGELOG). L'avis de sanction suit le même principe
// depuis la fiche étudiant → onglet "Sanctions" (2026-08-03) : il exige un `sanctionId` précis, sans
// liste de sanctions disponible ici. Les 3 contrats de travail (2026-08-06) suivent le même principe
// depuis la fiche enseignant → onglet "Contrats", ou la fiche employé → onglet "Contrat".
const SELECTABLE_TYPES = TIER1_DOCUMENT_TYPES.filter(
  (type) =>
    type !== "CARTE_ETUDIANT" &&
    type !== "RECU_PAIEMENT" &&
    type !== "BULLETIN_SALAIRE" &&
    type !== "SANCTION" &&
    type !== "FICHE_EMARGEMENT_ENSEIGNANT" &&
    type !== "CONTRAT_CDD_ADMINISTRATIF" &&
    type !== "CONTRAT_CDD_ENSEIGNANT" &&
    type !== "CONTRAT_VACATION"
);

/**
 * Génération d'un document officiel Tier 1 (MODULE-09 §0.4) — le formulaire de références change selon
 * le type sélectionné, chaque type attendant des paramètres différents (étudiant, employé, classe...).
 */
export function GenerateDocumentScreen() {
  const [documentType, setDocumentType] = useState<DocumentType>("CERTIFICAT_SCOLARITE");
  const [studentId, setStudentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [classId, setClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [seanceId, setSeanceId] = useState("");
  const [doubleExemplaire, setDoubleExemplaire] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [period, setPeriod] = useState<"JOUR" | "MOIS" | "ANNEE">("JOUR");
  const [periodDate, setPeriodDate] = useState("");
  const [cashRegisterSessionId, setCashRegisterSessionId] = useState("");
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [situationDate, setSituationDate] = useState("");
  const [bilanPeriod, setBilanPeriod] = useState<"MOIS" | "SEMESTRE" | "ANNEE">("MOIS");
  const [bilanDate, setBilanDate] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [installmentOrderIndex, setInstallmentOrderIndex] = useState("");

  const studentsQuery = trpc.students.list.useQuery({ pageSize: 200 });
  const employeesQuery = trpc.employees.list.useQuery({ pageSize: 200 });
  const teachersQuery = trpc.teachers.list.useQuery({ pageSize: 200 });
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const academicYearsQuery = trpc.academicYears.list.useQuery();
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const seancesQuery = trpc.seances.list.useQuery({
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const treasuryAccountsQuery = trpc.chartAccounts.list.useQuery({ type: "TRESORERIE" });
  const cashRegisterSessionsQuery = trpc.cashRegisterSessions.list.useQuery({});
  const cashRegistersQuery = trpc.cashRegisters.list.useQuery();

  const catalogQuery = trpc.documents.catalog.useQuery();
  const template = catalogQuery.data?.find((t) => t.documentType === documentType)?.template;
  const allowedTypes = catalogQuery.data ? new Set(catalogQuery.data.map((t) => t.documentType)) : null;
  const visibleSelectableTypes = allowedTypes
    ? SELECTABLE_TYPES.filter((type) => allowedTypes.has(type))
    : SELECTABLE_TYPES;

  const generate = trpc.documents.generate.useMutation();

  function buildInput(): GenerateDocumentInput | null {
    switch (documentType) {
      case "CERTIFICAT_SCOLARITE":
        return studentId ? { documentType, studentId, doubleExemplaire } : null;
      case "ATTESTATION_INSCRIPTION":
        return studentId ? { documentType, studentId, doubleExemplaire } : null;
      case "CARTE_ETUDIANT":
        return studentId ? { documentType, studentId } : null;
      case "ATTESTATION_TRAVAIL":
        return employeeId ? { documentType, employeeId, doubleExemplaire } : null;
      case "LISTE_ETUDIANTS":
        return academicYearId ? { documentType, academicYearId, classId: classId || undefined } : null;
      case "LISTE_ENSEIGNANTS":
        return { documentType };
      case "LISTE_CLASSES":
        return academicYearId ? { documentType, academicYearId } : null;
      case "FICHE_EMARGEMENT":
        return seanceId ? { documentType, seanceId } : null;
      case "EMPLOI_DU_TEMPS":
        return classId || teacherId ? { documentType, classId: classId || undefined, teacherId: teacherId || undefined } : null;
      case "HISTORIQUE_PAIEMENTS":
        return studentId ? { documentType, studentId, academicYearId: academicYearId || undefined } : null;
      case "GRAND_LIVRE_CAISSE":
        return accountId
          ? {
              documentType,
              accountId,
              dateFrom: dateFrom ? new Date(dateFrom) : undefined,
              dateTo: dateTo ? new Date(dateTo) : undefined,
            }
          : null;
      case "ETAT_RECETTES":
        return {
          documentType,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
        };
      case "RAPPORT_CAISSE":
        return { documentType, period, date: periodDate ? new Date(periodDate) : undefined };
      case "JOURNAL_CAISSE":
        return cashRegisterSessionId ? { documentType, cashRegisterSessionId } : null;
      case "SITUATION_CAISSE_JOURNALIERE":
        return cashRegisterId ? { documentType, cashRegisterId, date: situationDate ? new Date(situationDate) : undefined } : null;
      case "BILAN":
        return { documentType, period: bilanPeriod, date: bilanDate ? new Date(bilanDate) : undefined };
      case "FICHE_INSCRIPTION":
        return { documentType };
      case "FICHE_INSCRIPTION_COMPLETEE":
        return studentId ? { documentType, studentId } : null;
      case "RETARD_PAIEMENT":
        return academicYearId
          ? {
              documentType,
              academicYearId,
              filiereId: filiereId || undefined,
              levelId: levelId || undefined,
              classId: classId || undefined,
              installmentOrderIndex: installmentOrderIndex ? Number(installmentOrderIndex) : undefined,
            }
          : null;
      case "SITUATION_FINANCIERE":
        return academicYearId
          ? {
              documentType,
              academicYearId,
              filiereId: filiereId || undefined,
              levelId: levelId || undefined,
              classId: classId || undefined,
            }
          : null;
      default:
        return null;
    }
  }

  const input = buildInput();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Générer un document officiel</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Type de document</Label>
          <Select
            value={documentType}
            onChange={(e) => {
              setDocumentType(e.target.value as DocumentType);
              generate.reset();
            }}
          >
            {visibleSelectableTypes.map((type) => (
              <option key={type} value={type}>
                {TIER1_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>

        {(documentType === "CERTIFICAT_SCOLARITE" ||
          documentType === "ATTESTATION_INSCRIPTION" ||
          documentType === "CARTE_ETUDIANT" ||
          documentType === "HISTORIQUE_PAIEMENTS" ||
          documentType === "FICHE_INSCRIPTION_COMPLETEE") && (
          <div className="flex flex-col gap-1.5">
            <Label>Étudiant</Label>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(studentsQuery.data?.rows ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lastName} {s.firstName} ({s.matricule})
                </option>
              ))}
            </Select>
          </div>
        )}

        {documentType === "ATTESTATION_TRAVAIL" && (
          <div className="flex flex-col gap-1.5">
            <Label>Employé</Label>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(employeesQuery.data?.rows ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.lastName} {e.firstName} ({e.matricule})
                </option>
              ))}
            </Select>
          </div>
        )}

        {(documentType === "LISTE_ETUDIANTS" ||
          documentType === "LISTE_CLASSES" ||
          documentType === "HISTORIQUE_PAIEMENTS") && (
          <div className="flex flex-col gap-1.5">
            <Label>Année universitaire{documentType === "HISTORIQUE_PAIEMENTS" ? " (facultatif)" : ""}</Label>
            <Select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(academicYearsQuery.data ?? []).map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {(documentType === "LISTE_ETUDIANTS" || documentType === "EMPLOI_DU_TEMPS") && (
          <div className="flex flex-col gap-1.5">
            <Label>Classe {documentType === "EMPLOI_DU_TEMPS" ? "(ou enseignant ci-dessous)" : "(facultatif)"}</Label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">— Toutes —</option>
              {(classesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {documentType === "EMPLOI_DU_TEMPS" && (
          <div className="flex flex-col gap-1.5">
            <Label>Enseignant (si aucune classe sélectionnée)</Label>
            <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">— Aucun —</option>
              {(teachersQuery.data?.rows ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.lastName} {t.firstName}
                </option>
              ))}
            </Select>
          </div>
        )}

        {documentType === "FICHE_EMARGEMENT" && (
          <div className="flex flex-col gap-1.5">
            <Label>Séance (60 derniers jours)</Label>
            <Select value={seanceId} onChange={(e) => setSeanceId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(seancesQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.sessionDate).toLocaleDateString("fr-FR")} — {s.startTime} à {s.endTime}
                </option>
              ))}
            </Select>
          </div>
        )}

        {documentType === "GRAND_LIVRE_CAISSE" && (
          <div className="flex flex-col gap-1.5">
            <Label>Compte de trésorerie</Label>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(treasuryAccountsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {(documentType === "GRAND_LIVRE_CAISSE" || documentType === "ETAT_RECETTES") && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Du (facultatif)</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Au (facultatif)</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        {documentType === "RAPPORT_CAISSE" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Période</Label>
              <Select value={period} onChange={(e) => setPeriod(e.target.value as "JOUR" | "MOIS" | "ANNEE")}>
                {(Object.keys(RAPPORT_CAISSE_PERIOD_LABELS) as (keyof typeof RAPPORT_CAISSE_PERIOD_LABELS)[]).map((p) => (
                  <option key={p} value={p}>
                    {RAPPORT_CAISSE_PERIOD_LABELS[p]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date de référence (facultatif — aujourd'hui par défaut)</Label>
              <Input type="date" value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} />
            </div>
          </div>
        )}

        {documentType === "JOURNAL_CAISSE" && (
          <div className="flex flex-col gap-1.5">
            <Label>Session de caisse</Label>
            <Select value={cashRegisterSessionId} onChange={(e) => setCashRegisterSessionId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(cashRegisterSessionsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.cashRegisterName} — ouverte le {new Date(s.openedAt).toLocaleDateString("fr-FR")}
                  {s.status === "FERMEE" ? " (fermée)" : " (en cours)"}
                </option>
              ))}
            </Select>
          </div>
        )}

        {documentType === "SITUATION_CAISSE_JOURNALIERE" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Caisse</Label>
              <Select value={cashRegisterId} onChange={(e) => setCashRegisterId(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {(cashRegistersQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date (facultatif — aujourd'hui par défaut)</Label>
              <Input type="date" value={situationDate} onChange={(e) => setSituationDate(e.target.value)} />
            </div>
          </div>
        )}

        {documentType === "BILAN" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Période</Label>
              <Select value={bilanPeriod} onChange={(e) => setBilanPeriod(e.target.value as "MOIS" | "SEMESTRE" | "ANNEE")}>
                {(Object.keys(BILAN_PERIOD_LABELS) as (keyof typeof BILAN_PERIOD_LABELS)[]).map((p) => (
                  <option key={p} value={p}>
                    {BILAN_PERIOD_LABELS[p]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date de clôture (facultatif — aujourd'hui par défaut)</Label>
              <Input type="date" value={bilanDate} onChange={(e) => setBilanDate(e.target.value)} />
            </div>
          </div>
        )}

        {(documentType === "RETARD_PAIEMENT" || documentType === "SITUATION_FINANCIERE") && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Année universitaire</Label>
                <Select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {(academicYearsQuery.data ?? []).map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Filière (facultatif)</Label>
                <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
                  <option value="">— Toutes —</option>
                  {(filieresQuery.data ?? []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Niveau (facultatif)</Label>
                <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
                  <option value="">— Tous —</option>
                  {(levelsQuery.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Classe (facultatif)</Label>
                <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">— Toutes —</option>
                  {(classesQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {documentType === "RETARD_PAIEMENT" && (
              <div className="flex flex-col gap-1.5">
                <Label>Tranche (facultatif — toutes les tranches en retard si vide)</Label>
                <Input
                  type="number"
                  min={1}
                  value={installmentOrderIndex}
                  onChange={(e) => setInstallmentOrderIndex(e.target.value)}
                  placeholder="Ex. 1, 2, 3..."
                />
              </div>
            )}
          </>
        )}

        {template?.allowDoubleExemplaire && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={doubleExemplaire} onChange={(e) => setDoubleExemplaire(e.target.checked)} />
            Imprimer deux exemplaires ({template.secondaryCopyLabel ?? "Exemplaire"})
          </label>
        )}

        {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}

        {generate.data && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Document généré — n° <strong>{generate.data.documentNumber}</strong>.{" "}
            <a
              className="underline"
              href={resolveUploadUrl(generate.data.filePath) ?? "#"}
              target="_blank"
              rel="noreferrer"
            >
              Télécharger le PDF
            </a>
          </div>
        )}

        <Button
          className="self-end"
          disabled={!input || generate.isPending}
          onClick={() => input && generate.mutate(input)}
        >
          {generate.isPending ? "Génération…" : "Générer le document"}
        </Button>
      </CardContent>
    </Card>
  );
}
