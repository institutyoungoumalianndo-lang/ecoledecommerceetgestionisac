import { zodResolver } from "@hookform/resolvers/zod";
import { type TeacherDto, type UpdateTeacherInput, updateTeacherInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, ImageUpload, Input, Select } from "@isac-erp/ui";
import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { resolveUploadUrl, uploadImage } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Identité, coordonnées et informations professionnelles — éditables ici (MODULE-05 §10.2). */
export function TeacherIdentityTab({ teacher }: { teacher: TeacherDto }) {
  const utils = trpc.useUtils();
  const canEdit = useHasPermission("ENSEIGNANTS:MODIFICATION");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const statusesQuery = trpc.teacherStatuses.list.useQuery();
  const contractTypesQuery = trpc.teacherContractTypes.list.useQuery();

  const update = trpc.teachers.update.useMutation({
    onSuccess: () => void utils.teachers.getById.invalidate({ id: teacher.id }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateTeacherInput>({ resolver: zodResolver(updateTeacherInputSchema) });

  useEffect(() => {
    reset({ ...teacher, weeklyHoursCapacity: teacher.weeklyHoursCapacity ?? undefined });
  }, [teacher, reset]);

  async function handlePhotoSelected(file: File) {
    setIsUploadingPhoto(true);
    try {
      const path = await uploadImage(file);
      await update.mutateAsync({ id: teacher.id, photoPath: path });
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit((values) => update.mutate(values))}>
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
              <Input icon={User} disabled={!canEdit} {...register("lastName")} />
            </FormField>
            <FormField label="Prénom" required error={errors.firstName?.message}>
              <Input icon={User} disabled={!canEdit} {...register("firstName")} />
            </FormField>
            <FormField label="Sexe">
              <Select disabled={!canEdit} {...register("gender")}>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </Select>
            </FormField>
            <FormField label="Date de naissance">
              <Input type="date" disabled={!canEdit} {...register("birthDate")} />
            </FormField>
            <FormField label="Lieu de naissance">
              <Input disabled={!canEdit} {...register("birthPlace")} />
            </FormField>
            <FormField label="Nationalité">
              <Input disabled={!canEdit} {...register("nationality")} />
            </FormField>
            <FormField label="Pièce d'identité (n°)">
              <Input disabled={!canEdit} {...register("idNumber")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card variant="form">
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Adresse"><Input disabled={!canEdit} {...register("address")} /></FormField>
          <FormField label="Ville"><Input disabled={!canEdit} {...register("city")} /></FormField>
          <FormField label="Téléphone principal"><Input disabled={!canEdit} {...register("phonePrimary")} /></FormField>
          <FormField label="Téléphone secondaire"><Input disabled={!canEdit} {...register("phoneSecondary")} /></FormField>
          <FormField label="WhatsApp"><Input disabled={!canEdit} {...register("whatsapp")} /></FormField>
          <FormField label="E-mail" error={errors.email?.message}>
            <Input type="email" disabled={!canEdit} {...register("email")} />
          </FormField>
        </CardContent>
      </Card>

      <Card variant="form">
        <CardHeader>
          <CardTitle>Informations professionnelles</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Diplôme le plus élevé"><Input disabled={!canEdit} {...register("highestDegree")} /></FormField>
          <FormField label="Grade académique"><Input disabled={!canEdit} {...register("academicGrade")} /></FormField>
          <FormField label="Spécialité"><Input disabled={!canEdit} {...register("specialty")} /></FormField>
          <FormField label="Fonction"><Input disabled={!canEdit} {...register("function")} /></FormField>
          <FormField label="Date de recrutement">
            <Input type="date" disabled={!canEdit} {...register("hireDate")} />
          </FormField>
          <FormField label="Type de contrat">
            <Select disabled={!canEdit} {...register("contractTypeId")}>
              <option value="">—</option>
              {(contractTypesQuery.data ?? []).filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Statut">
            <Select disabled={!canEdit} {...register("statusId")}>
              <option value="">—</option>
              {(statusesQuery.data ?? []).filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Plafond d'heures hebdomadaire" error={errors.weeklyHoursCapacity?.message}>
            <Input
              type="number"
              step="0.5"
              min="0"
              disabled={!canEdit}
              {...register("weeklyHoursCapacity", { valueAsNumber: true })}
            />
          </FormField>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      )}
      {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
    </form>
  );
}
