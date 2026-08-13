import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateStudentInput, type StudentDuplicateMatch, createStudentInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, ImageUpload, Input, Select } from "@isac-erp/ui";
import { GraduationCap, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resolveUploadUrl, uploadImage } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { DuplicateWarningDialog } from "./DuplicateWarningDialog";

/** Création d'un étudiant (MODULE-04 §4.2) — page dédiée (formulaire trop dense pour une modale). */
export function StudentFormScreen({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (studentId: string) => void;
}) {
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [duplicates, setDuplicates] = useState<StudentDuplicateMatch[] | null>(null);

  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const yearsQuery = trpc.academicYears.list.useQuery();
  const regimesQuery = trpc.enrollmentRegimes.list.useQuery();
  const filiereById = new Map((filieresQuery.data ?? []).map((f) => [f.id, f]));
  const levelById = new Map((levelsQuery.data ?? []).map((l) => [l.id, l]));
  const yearById = new Map((yearsQuery.data ?? []).map((y) => [y.id, y]));

  const checkDuplicates = trpc.students.checkDuplicates.useMutation();
  const create = trpc.students.create.useMutation({
    onSuccess: (student) => onCreated(student.id),
  });

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
      const path = await uploadImage(file);
      setPhotoPath(path);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function onSubmit(values: CreateStudentInput) {
    const payload = { ...values, photoPath };
    const matches = await checkDuplicates.mutateAsync({
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
    create.mutate(payload);
  }

  function confirmDespiteDuplicates() {
    const values = getValues();
    create.mutate({ ...values, photoPath, duplicateWarningAcknowledged: true });
    setDuplicates(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Nouvel étudiant</h2>
        <Button variant="outline" onClick={onCancel}>
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
                {(classesQuery.data ?? []).map((c) => (
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
                {(regimesQuery.data ?? []).filter((r) => r.isActive).map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Date d'inscription">
              <Input type="date" {...register("enrollmentDate")} />
            </FormField>
          </CardContent>
        </Card>

        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={create.isPending || checkDuplicates.isPending}>
            {create.isPending || checkDuplicates.isPending ? "Enregistrement…" : "Créer l'étudiant"}
          </Button>
        </div>
      </form>

      {duplicates && (
        <DuplicateWarningDialog
          matches={duplicates}
          onCancel={() => setDuplicates(null)}
          onConfirm={confirmDespiteDuplicates}
          isSubmitting={create.isPending}
        />
      )}
    </div>
  );
}
