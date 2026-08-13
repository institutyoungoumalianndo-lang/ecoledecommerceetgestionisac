"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateTeacherInput, TeacherContractTypeDto, TeacherStatusDto } from "@isac-erp/shared";
import { createTeacherInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, ImageUpload, Input, Select } from "@isac-erp/ui";
import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../../../../lib/trpc";
import { resolveUploadUrl, uploadImage } from "../../../../../lib/upload";

/** Création d'un enseignant (MODULE-05 §10.2), portée au portail Super Administrateur — même
 * formulaire que `TeacherFormScreen.tsx` (desktop), adapté au client tRPC vanilla du portail. */
export default function AdminNewTeacherPage() {
  const router = useRouter();
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<TeacherStatusDto[]>([]);
  const [contractTypes, setContractTypes] = useState<TeacherContractTypeDto[]>([]);

  useEffect(() => {
    trpcClient.teacherStatuses.list.query().then(setStatuses).catch(() => setStatuses([]));
    trpcClient.teacherContractTypes.list.query().then(setContractTypes).catch(() => setContractTypes([]));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTeacherInput>({ resolver: zodResolver(createTeacherInputSchema) });

  async function handlePhotoSelected(file: File) {
    setIsUploadingPhoto(true);
    try {
      setPhotoPath(await uploadImage(file));
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function onSubmit(values: CreateTeacherInput) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const teacher = await trpcClient.teachers.create.mutate({ ...values, photoPath });
      router.push(`/admin/enseignants/${teacher.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de la création.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Nouvel enseignant</h1>
        <Button variant="outline" onClick={() => router.push("/admin/enseignants")}>
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
              <FormField label="Pièce d'identité (n°)">
                <Input {...register("idNumber")} />
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
            <FormField label="Ville"><Input {...register("city")} /></FormField>
            <FormField label="Téléphone principal"><Input {...register("phonePrimary")} /></FormField>
            <FormField label="Téléphone secondaire"><Input {...register("phoneSecondary")} /></FormField>
            <FormField label="WhatsApp"><Input {...register("whatsapp")} /></FormField>
            <FormField label="E-mail" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </FormField>
          </CardContent>
        </Card>

        <Card variant="form">
          <CardHeader>
            <CardTitle>Informations professionnelles</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField label="Diplôme le plus élevé"><Input {...register("highestDegree")} /></FormField>
            <FormField label="Grade académique"><Input {...register("academicGrade")} /></FormField>
            <FormField label="Spécialité"><Input {...register("specialty")} /></FormField>
            <FormField label="Fonction"><Input {...register("function")} /></FormField>
            <FormField label="Date de recrutement">
              <Input type="date" {...register("hireDate")} />
            </FormField>
            <FormField label="Type de contrat">
              <Select {...register("contractTypeId")}>
                <option value="">—</option>
                {contractTypes.filter((c) => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Statut">
              <Select {...register("statusId")}>
                <option value="">—</option>
                {statuses.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Plafond d'heures hebdomadaire" error={errors.weeklyHoursCapacity?.message}>
              <Input type="number" step="0.5" min="0" {...register("weeklyHoursCapacity", { valueAsNumber: true })} />
            </FormField>
          </CardContent>
        </Card>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/enseignants")}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement…" : "Créer l'enseignant"}
          </Button>
        </div>
      </form>
    </div>
  );
}
