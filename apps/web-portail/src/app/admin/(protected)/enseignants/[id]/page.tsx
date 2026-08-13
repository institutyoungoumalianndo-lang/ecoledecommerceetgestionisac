"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { TeacherContractTypeDto, TeacherDto, TeacherStatusDto, UpdateTeacherInput } from "@isac-erp/shared";
import { updateTeacherInputSchema } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, FormField, ImageUpload, Input, Select } from "@isac-erp/ui";
import { User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../../../../lib/trpc";
import { resolveUploadUrl, uploadImage } from "../../../../../lib/upload";

/** Fiche enseignant — identité/coordonnées/informations professionnelles éditables (MODULE-05 §10.2),
 * portée au portail Super Administrateur — même périmètre que `TeacherIdentityTab.tsx` (desktop). */
export default function AdminTeacherDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const teacherId = params.id;

  const [teacher, setTeacher] = useState<TeacherDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<TeacherStatusDto[]>([]);
  const [contractTypes, setContractTypes] = useState<TeacherContractTypeDto[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateTeacherInput>({ resolver: zodResolver(updateTeacherInputSchema) });

  useEffect(() => {
    trpcClient.teacherStatuses.list.query().then(setStatuses).catch(() => setStatuses([]));
    trpcClient.teacherContractTypes.list.query().then(setContractTypes).catch(() => setContractTypes([]));
  }, []);

  useEffect(() => {
    trpcClient.teachers.getById
      .query({ id: teacherId })
      .then((result) => {
        setTeacher(result);
        reset({ ...result, weeklyHoursCapacity: result.weeklyHoursCapacity ?? undefined });
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement de l'enseignant."));
  }, [teacherId, reset]);

  async function handlePhotoSelected(file: File) {
    setIsUploadingPhoto(true);
    try {
      const path = await uploadImage(file);
      const updated = await trpcClient.teachers.update.mutate({ id: teacherId, photoPath: path });
      setTeacher(updated);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function onSubmit(values: UpdateTeacherInput) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await trpcClient.teachers.update.mutate(values);
      setTeacher(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" onClick={() => router.push("/admin/enseignants")}>
          ← Retour à la liste
        </Button>
      </div>
    );
  }

  if (!teacher) return null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            {teacher.lastName} {teacher.firstName}
          </h1>
          <Badge>{teacher.matricule}</Badge>
          {teacher.archivedAt && <Badge variant="muted">Archivé</Badge>}
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/enseignants")}>
          ← Retour à la liste
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
              currentImageUrl={resolveUploadUrl(teacher.photoPath)}
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
              <FormField label="Sexe">
                <Select {...register("gender")}>
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

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
