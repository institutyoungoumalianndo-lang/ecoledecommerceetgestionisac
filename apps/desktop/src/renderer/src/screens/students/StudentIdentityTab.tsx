import { zodResolver } from "@hookform/resolvers/zod";
import { type StudentDto, type UpdateStudentInput, updateStudentInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, ImageUpload, Input, Select } from "@isac-erp/ui";
import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { resolveUploadUrl, uploadImage } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/**
 * Identité, coordonnées et situation familiale — éditables ici (MODULE-04
 * §3.2). La classe/filière/niveau ne s'éditent JAMAIS depuis ce formulaire :
 * uniquement via l'action "Changer de classe" de l'onglet Historique.
 */
export function StudentIdentityTab({ student }: { student: StudentDto }) {
  const utils = trpc.useUtils();
  const canEdit = useHasPermission("ETUDIANTS:MODIFICATION");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const update = trpc.students.update.useMutation({
    onSuccess: () => void utils.students.getById.invalidate({ id: student.id }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateStudentInput>({ resolver: zodResolver(updateStudentInputSchema) });

  useEffect(() => {
    reset(student);
  }, [student, reset]);

  async function handlePhotoSelected(file: File) {
    setIsUploadingPhoto(true);
    try {
      const path = await uploadImage(file);
      await update.mutateAsync({ id: student.id, photoPath: path });
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
            currentImageUrl={resolveUploadUrl(student.photoPath)}
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
            <FormField label="INA (Identifiant National)" error={errors.ina?.message}>
              <Input disabled={!canEdit} {...register("ina")} />
            </FormField>
            <FormField label="Programme" error={errors.programme?.message}>
              <Select disabled={!canEdit} {...register("programme")}>
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
          <FormField label="Adresse"><Input disabled={!canEdit} {...register("address")} /></FormField>
          <FormField label="Quartier"><Input disabled={!canEdit} {...register("neighborhood")} /></FormField>
          <FormField label="Commune"><Input disabled={!canEdit} {...register("commune")} /></FormField>
          <FormField label="Ville"><Input disabled={!canEdit} {...register("city")} /></FormField>
          <FormField label="Préfecture"><Input disabled={!canEdit} {...register("prefecture")} /></FormField>
          <FormField label="Pays"><Input disabled={!canEdit} {...register("country")} /></FormField>
          <FormField label="Téléphone principal"><Input disabled={!canEdit} {...register("phonePrimary")} /></FormField>
          <FormField label="Téléphone secondaire"><Input disabled={!canEdit} {...register("phoneSecondary")} /></FormField>
          <FormField label="E-mail" error={errors.email?.message}>
            <Input type="email" disabled={!canEdit} {...register("email")} />
          </FormField>
        </CardContent>
      </Card>

      <Card variant="form">
        <CardHeader>
          <CardTitle>Situation familiale</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField label="Situation familiale">
            <Select disabled={!canEdit} {...register("maritalStatus")}>
              <option value="CELIBATAIRE">Célibataire</option>
              <option value="MARIE">Marié(e)</option>
              <option value="AUTRE">Autre</option>
            </Select>
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
