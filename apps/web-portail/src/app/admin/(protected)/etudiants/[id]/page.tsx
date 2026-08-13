"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { StudentDto, UpdateStudentInput } from "@isac-erp/shared";
import { updateStudentInputSchema } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, FormField, ImageUpload, Input, Select } from "@isac-erp/ui";
import { User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../../../../lib/trpc";
import { resolveUploadUrl, uploadImage } from "../../../../../lib/upload";

/** Fiche étudiant — identité/coordonnées/situation familiale éditables (MODULE-04 §3.2), portée au
 * portail Super Administrateur — même périmètre que `StudentIdentityTab.tsx` (desktop). La
 * classe/filière/niveau ne s'éditent jamais ici, comme sur le desktop (action dédiée "Changer de
 * classe", pas encore reprise côté portail). */
export default function AdminStudentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = params.id;

  const [student, setStudent] = useState<StudentDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateStudentInput>({ resolver: zodResolver(updateStudentInputSchema) });

  useEffect(() => {
    trpcClient.students.getById
      .query({ id: studentId })
      .then((result) => {
        setStudent(result);
        reset(result);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement de l'étudiant."));
  }, [studentId, reset]);

  async function handlePhotoSelected(file: File) {
    setIsUploadingPhoto(true);
    try {
      const path = await uploadImage(file);
      const updated = await trpcClient.students.update.mutate({ id: studentId, photoPath: path });
      setStudent(updated);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function onSubmit(values: UpdateStudentInput) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await trpcClient.students.update.mutate(values);
      setStudent(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  }

  if (loadError && !student) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" onClick={() => router.push("/admin/etudiants")}>
          ← Retour à la liste
        </Button>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            {student.lastName} {student.firstName}
          </h1>
          <Badge>{student.matricule}</Badge>
          {student.archivedAt && <Badge variant="muted">Archivé</Badge>}
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/etudiants")}>
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
              currentImageUrl={resolveUploadUrl(student.photoPath)}
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
