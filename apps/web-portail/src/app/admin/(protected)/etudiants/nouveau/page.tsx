"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  AcademicYearDto,
  CreateStudentInput,
  EnrollmentRegimeDto,
  FiliereDto,
  LevelDto,
  SchoolClassDto,
  StudentDuplicateMatch,
} from "@isac-erp/shared";
import { createStudentInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, FormField, ImageUpload, Input, Select } from "@isac-erp/ui";
import { GraduationCap, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../../../../lib/trpc";
import { resolveUploadUrl, uploadImage } from "../../../../../lib/upload";

const REASON_LABELS: Record<string, string> = {
  TELEPHONE: "même téléphone",
  EMAIL: "même e-mail",
  NOM_DATE_NAISSANCE: "même nom, prénom et date de naissance",
};

/** Création d'un étudiant (MODULE-04 §4.2), portée au portail Super Administrateur — même formulaire
 * que `StudentFormScreen.tsx` (desktop), adapté au client tRPC vanilla du portail. */
export default function AdminNewStudentPage() {
  const router = useRouter();
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [duplicates, setDuplicates] = useState<StudentDuplicateMatch[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [filieres, setFilieres] = useState<FiliereDto[]>([]);
  const [levels, setLevels] = useState<LevelDto[]>([]);
  const [classes, setClasses] = useState<SchoolClassDto[]>([]);
  const [years, setYears] = useState<AcademicYearDto[]>([]);
  const [regimes, setRegimes] = useState<EnrollmentRegimeDto[]>([]);

  useEffect(() => {
    trpcClient.filieres.list.query().then(setFilieres).catch(() => setFilieres([]));
    trpcClient.levels.list.query().then(setLevels).catch(() => setLevels([]));
    trpcClient.schoolClasses.list.query({}).then(setClasses).catch(() => setClasses([]));
    trpcClient.academicYears.list.query().then(setYears).catch(() => setYears([]));
    trpcClient.enrollmentRegimes.list.query().then(setRegimes).catch(() => setRegimes([]));
  }, []);

  const filiereById = new Map(filieres.map((f) => [f.id, f]));
  const levelById = new Map(levels.map((l) => [l.id, l]));
  const yearById = new Map(years.map((y) => [y.id, y]));

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentInputSchema),
    defaultValues: { maritalStatus: "CELIBATAIRE" },
  });

  async function handlePhotoSelected(file: File) {
    setIsUploadingPhoto(true);
    try {
      setPhotoPath(await uploadImage(file));
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function submitCreate(payload: CreateStudentInput) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const student = await trpcClient.students.create.mutate(payload);
      router.push(`/admin/etudiants/${student.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de la création.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(values: CreateStudentInput) {
    const payload = { ...values, photoPath };
    setSubmitError(null);
    const matches = await trpcClient.students.checkDuplicates.mutate({
      lastName: payload.lastName,
      firstName: payload.firstName,
      birthDate: payload.birthDate,
      phonePrimary: payload.phonePrimary,
      email: payload.email,
    });
    if (matches.length > 0) {
      setDuplicates(matches);
      return;
    }
    await submitCreate(payload);
  }

  function confirmDespiteDuplicates() {
    const values = getValues();
    setDuplicates(null);
    void submitCreate({ ...values, photoPath, duplicateWarningAcknowledged: true });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Nouvel étudiant</h1>
        <Button variant="outline" onClick={() => router.push("/admin/etudiants")}>
          Annuler
        </Button>
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
        <Card variant="form">
          <CardHeader>
            <CardTitle>Identité</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ImageUpload
              label="Photo"
              currentImageUrl={resolveUploadUrl(photoPath)}
              isUploading={isUploadingPhoto}
              onFileSelected={(file) => void handlePhotoSelected(file)}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nom" required error={errors.lastName?.message}>
                <Input icon={User} {...register("lastName")} />
              </FormField>
              <FormField label="Prénom" required error={errors.firstName?.message}>
                <Input icon={User} {...register("firstName")} />
              </FormField>
              <FormField label="Sexe" required error={errors.gender?.message}>
                <Select {...register("gender")}>
                  <option value="">—</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </Select>
              </FormField>
              <FormField label="Date de naissance">
                <Input type="date" {...register("birthDate")} />
              </FormField>
              <FormField label="Lieu de naissance">
                <Input {...register("birthPlace")} />
              </FormField>
              <FormField label="Nationalité">
                <Input {...register("nationality")} />
              </FormField>
              <FormField label="INA (Identifiant National)" error={errors.ina?.message}>
                <Input {...register("ina")} />
              </FormField>
              <FormField label="Programme" error={errors.programme?.message}>
                <Select {...register("programme")}>
                  <option value="">—</option>
                  <option value="DQP">DQP</option>
                  <option value="CAP">CAP</option>
                  <option value="BEP">BEP</option>
                  <option value="BT">BT</option>
                  <option value="BTS">BTS</option>
                </Select>
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card variant="form">
          <CardHeader>
            <CardTitle>Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField label="Adresse"><Input {...register("address")} /></FormField>
            <FormField label="Quartier"><Input {...register("neighborhood")} /></FormField>
            <FormField label="Commune"><Input {...register("commune")} /></FormField>
            <FormField label="Ville"><Input {...register("city")} /></FormField>
            <FormField label="Préfecture"><Input {...register("prefecture")} /></FormField>
            <FormField label="Pays"><Input {...register("country")} /></FormField>
            <FormField label="Téléphone principal"><Input {...register("phonePrimary")} /></FormField>
            <FormField label="Téléphone secondaire"><Input {...register("phoneSecondary")} /></FormField>
            <FormField label="E-mail" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </FormField>
          </CardContent>
        </Card>

        <Card variant="form">
          <CardHeader>
            <CardTitle>Situation familiale</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField label="Situation familiale">
              <Select {...register("maritalStatus")}>
                <option value="CELIBATAIRE">Célibataire</option>
                <option value="MARIE">Marié(e)</option>
                <option value="AUTRE">Autre</option>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        <Card variant="form">
          <CardHeader>
            <CardTitle>Informations académiques</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField label="Classe" required error={errors.classId?.message}>
              <Select icon={GraduationCap} {...register("classId")}>
                <option value="">—</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {filiereById.get(c.filiereId)?.name ?? "?"} / {levelById.get(c.levelId)?.label ?? "?"} (
                    {yearById.get(c.academicYearId)?.label ?? "?"})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Régime">
              <Select {...register("regimeId")}>
                <option value="">—</option>
                {regimes.filter((r) => r.isActive).map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Date d'inscription">
              <Input type="date" {...register("enrollmentDate")} />
            </FormField>
          </CardContent>
        </Card>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/etudiants")}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement…" : "Créer l'étudiant"}
          </Button>
        </div>
      </form>

      {duplicates && (
        <Dialog
          open
          onClose={() => setDuplicates(null)}
          title="Doublon potentiel détecté"
          description="Un ou plusieurs étudiants existants correspondent à ces informations. Vérifiez avant de continuer."
        >
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {duplicates.map((m) => (
                <li key={m.id} className="rounded-md border border-border p-2 text-sm">
                  <strong>{m.matricule}</strong> — {m.lastName} {m.firstName}
                  <div className="text-xs text-muted-foreground">
                    Correspondance : {m.matchedOn.map((r) => REASON_LABELS[r] ?? r).join(", ")}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDuplicates(null)}>
                Annuler
              </Button>
              <Button onClick={confirmDespiteDuplicates} disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement…" : "Ce n'est pas un doublon — continuer"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
