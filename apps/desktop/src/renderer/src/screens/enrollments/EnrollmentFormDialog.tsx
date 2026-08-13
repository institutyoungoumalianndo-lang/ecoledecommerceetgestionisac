import type { EnrollmentStatus, StudentListRow } from "@isac-erp/shared";
import { Badge, Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

const STATUS_OPTIONS: { value: EnrollmentStatus; label: string }[] = [
  { value: "NOUVEAU", label: "Nouveau" },
  { value: "ANCIEN", label: "Ancien (réinscription)" },
  { value: "REDOUBLANT", label: "Redoublant" },
  { value: "TRANSFERT", label: "Transfert" },
  { value: "REPRISE", label: "Reprise" },
];

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ACTE_NAISSANCE: "Acte de naissance",
  DIPLOME: "Diplôme",
  RELEVE: "Relevés",
  PHOTO: "Photo",
  CARTE_IDENTITE_PASSEPORT: "Carte d'identité / Passeport",
  CERTIFICAT_MEDICAL: "Certificat médical",
  AUTRE: "Autre",
};

/**
 * Assistant "Nouvelle inscription" / "Réinscription" (MODULE-04.1 §1.2/§4) —
 * même formulaire pour les deux : si `initialStudentId` est fourni (bouton
 * "Réinscrire" de la fiche étudiant), l'étape de recherche est sautée.
 *
 * `scopeSearchToYearId` (2026-08-09, retour du porteur du projet — bouton "Réinscription" du module
 * Étudiants) : quand fourni, la recherche ne propose que les étudiants SANS inscription pour cette
 * année, pour cibler exactement ceux qui doivent être réinscrits. Laissé vide depuis "Nouvelle
 * inscription" (module Inscriptions), qui garde son comportement de recherche large existant.
 *
 * Les coordonnées (téléphone/email/adresse) de l'étudiant sélectionné sont éditables directement ici
 * (même retour) — l'identité complète (nom, naissance, photo...) reste modifiable depuis sa fiche,
 * ce formulaire restant volontairement compact (voir StudentFormScreen.tsx : "trop dense pour une
 * modale").
 */
export function EnrollmentFormDialog({
  initialStudentId,
  scopeSearchToYearId,
  onClose,
}: {
  initialStudentId?: string;
  scopeSearchToYearId?: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentListRow | null>(null);
  const [classId, setClassId] = useState("");
  const [regimeId, setRegimeId] = useState("");
  const [status, setStatus] = useState<EnrollmentStatus>(initialStudentId ? "ANCIEN" : "NOUVEAU");
  const [enrollmentDate, setEnrollmentDate] = useState("");
  const [feeAmountExpected, setFeeAmountExpected] = useState("");
  const [phonePrimary, setPhonePrimary] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [commune, setCommune] = useState("");
  const [city, setCity] = useState("");

  const utils = trpc.useUtils();
  const studentId = initialStudentId ?? selectedStudent?.id;

  const studentQuery = trpc.students.getById.useQuery({ id: studentId! }, { enabled: Boolean(studentId) });
  const searchQuery = trpc.students.list.useQuery(
    {
      search,
      includeArchived: false,
      needsReenrollmentForYearId: scopeSearchToYearId,
      sortBy: "lastName",
      sortDirection: "asc",
      page: 1,
      pageSize: 10,
    },
    { enabled: !initialStudentId && search.trim().length > 0 }
  );

  // Pré-remplit les coordonnées éditables dès que la fiche de l'étudiant sélectionné est chargée.
  useEffect(() => {
    const s = studentQuery.data;
    if (!s) return;
    setPhonePrimary(s.phonePrimary ?? "");
    setPhoneSecondary(s.phoneSecondary ?? "");
    setEmail(s.email ?? "");
    setAddress(s.address ?? "");
    setNeighborhood(s.neighborhood ?? "");
    setCommune(s.commune ?? "");
    setCity(s.city ?? "");
  }, [studentQuery.data]);

  const yearsQuery = trpc.academicYears.list.useQuery();
  const activeYear = yearsQuery.data?.find((y) => y.isActive);
  const classesQuery = trpc.schoolClasses.list.useQuery({ academicYearId: activeYear?.id });
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const regimesQuery = trpc.enrollmentRegimes.list.useQuery();
  const filiereById = new Map((filieresQuery.data ?? []).map((f) => [f.id, f]));
  const levelById = new Map((levelsQuery.data ?? []).map((l) => [l.id, l]));

  const conditionsQuery = trpc.enrollments.checkConditions.useQuery(
    { studentId: studentId!, classId },
    { enabled: Boolean(studentId && classId) }
  );

  const updateStudent = trpc.students.update.useMutation();
  const create = trpc.enrollments.create.useMutation({
    onSuccess: () => {
      void utils.students.list.invalidate();
      void utils.studentEnrollments.listByStudent.invalidate();
      void utils.enrollments.list.invalidate();
      onClose();
    },
  });

  async function submit() {
    if (!studentId || !classId) return;
    // Coordonnées enregistrées avant l'inscription elle-même — jamais bloquant si rien n'a changé
    // (mise à jour idempotente avec les valeurs déjà affichées).
    await updateStudent.mutateAsync({
      id: studentId,
      phonePrimary: phonePrimary || null,
      phoneSecondary: phoneSecondary || null,
      email: email || null,
      address: address || null,
      neighborhood: neighborhood || null,
      commune: commune || null,
      city: city || null,
    });
    create.mutate({
      studentId,
      classId,
      regimeId: regimeId || undefined,
      status,
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
      feeAmountExpected: feeAmountExpected ? Number(feeAmountExpected) : undefined,
    });
  }

  const conditions = conditionsQuery.data;
  const canSubmit =
    Boolean(studentId && classId) &&
    !conditions?.alreadyEnrolledThisYear &&
    !conditions?.capacityReached &&
    (conditions?.missingRequiredDocumentTypes.length ?? 0) === 0;

  return (
    <Dialog
      open
      onClose={onClose}
      title={initialStudentId ? "Réinscrire l'étudiant" : "Nouvelle inscription"}
      description={
        initialStudentId
          ? undefined
          : "Pour un nouvel étudiant, utilisez le bouton « Nouvel étudiant » du module Étudiants — il inclut déjà la première inscription."
      }
    >
      <div className="flex flex-col gap-4">
        {!initialStudentId && (
          <div className="flex flex-col gap-1.5">
            <Label>Étudiant (recherche par matricule, nom, prénom)</Label>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedStudent(null);
              }}
            />
            {searchQuery.data && searchQuery.data.rows.length > 0 && !selectedStudent && (
              <ul className="flex flex-col gap-1 rounded-md border border-border p-1">
                {searchQuery.data.rows.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                      onClick={() => setSelectedStudent(s)}
                    >
                      {s.matricule} — {s.lastName} {s.firstName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedStudent && (
              <p className="text-sm">
                Étudiant sélectionné : <strong>{selectedStudent.matricule} — {selectedStudent.lastName} {selectedStudent.firstName}</strong>
              </p>
            )}
          </div>
        )}
        {initialStudentId && studentQuery.data && (
          <p className="text-sm">
            Étudiant : <strong>{studentQuery.data.matricule} — {studentQuery.data.lastName} {studentQuery.data.firstName}</strong>
          </p>
        )}

        {studentId && studentQuery.data && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">Coordonnées</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Téléphone principal</Label>
                <Input value={phonePrimary} onChange={(e) => setPhonePrimary(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Téléphone secondaire</Label>
                <Input value={phoneSecondary} onChange={(e) => setPhoneSecondary(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Adresse</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Quartier</Label>
                <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Commune</Label>
                <Input value={commune} onChange={(e) => setCommune(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Ville</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Classe</Label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">—</option>
              {(classesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {filiereById.get(c.filiereId)?.name ?? "?"} / {levelById.get(c.levelId)?.label ?? "?"}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Régime</Label>
            <Select value={regimeId} onChange={(e) => setRegimeId(e.target.value)}>
              <option value="">—</option>
              {(regimesQuery.data ?? []).filter((r) => r.isActive).map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Statut</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as EnrollmentStatus)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date d'inscription</Label>
            <Input type="date" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Montant des frais attendu</Label>
            <Input type="number" min={0} value={feeAmountExpected} onChange={(e) => setFeeAmountExpected(e.target.value)} />
          </div>
        </div>

        {conditions && (
          <div className="flex flex-col gap-1">
            {conditions.alreadyEnrolledThisYear && (
              <Badge variant="destructive">Cet étudiant est déjà inscrit pour cette année.</Badge>
            )}
            {conditions.capacityReached && (
              <Badge variant="destructive">
                Capacité atteinte ({conditions.currentClassHeadcount}/{conditions.classCapacity}).
              </Badge>
            )}
            {conditions.missingRequiredDocumentTypes.length > 0 && (
              <Badge variant="destructive">
                Documents manquants : {conditions.missingRequiredDocumentTypes.map((t) => DOCUMENT_TYPE_LABELS[t] ?? t).join(", ")}
              </Badge>
            )}
            {!conditions.alreadyEnrolledThisYear &&
              !conditions.capacityReached &&
              conditions.missingRequiredDocumentTypes.length === 0 && <Badge variant="success">Conditions réunies</Badge>}
          </div>
        )}

        {updateStudent.error && <p className="text-sm text-destructive">{updateStudent.error.message}</p>}
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={!canSubmit || create.isPending || updateStudent.isPending} onClick={() => void submit()}>
            {create.isPending || updateStudent.isPending ? "Enregistrement…" : "Confirmer l'inscription"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
