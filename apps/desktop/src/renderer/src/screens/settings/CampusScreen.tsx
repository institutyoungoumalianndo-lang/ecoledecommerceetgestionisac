import { zodResolver } from "@hookform/resolvers/zod";
import { type UpdateCampusSettingsInput, updateCampusSettingsInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, ImageUpload, Input, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { resolveUploadUrl, uploadImage } from "../../lib/upload";
import { trpc } from "../../lib/trpc";

/** Campus (§3.3) — un seul campus par installation (architecture mono-campus, ADR-005). Logo du
 * campus (MODULE-09 §1.3) : optionnel, distinct des logos établissement/ministère. */
export function CampusScreen() {
  const utils = trpc.useUtils();
  const query = trpc.campus.get.useQuery();
  const usersQuery = trpc.users.list.useQuery();
  const [phonesText, setPhonesText] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const update = trpc.campus.update.useMutation({
    onSuccess: () => void utils.campus.get.invalidate(),
  });

  async function handleLogoUpload(file: File) {
    setIsUploadingLogo(true);
    try {
      const path = await uploadImage(file);
      await update.mutateAsync({ logoPath: path });
    } finally {
      setIsUploadingLogo(false);
    }
  }

  const { register, handleSubmit, reset } = useForm<UpdateCampusSettingsInput>({
    resolver: zodResolver(updateCampusSettingsInputSchema),
  });

  useEffect(() => {
    if (query.data) {
      reset(query.data);
      setPhonesText(query.data.phones.join(", "));
    }
  }, [query.data, reset]);

  function submitWithPhones(values: UpdateCampusSettingsInput) {
    const phones = phonesText.split(",").map((p) => p.trim()).filter(Boolean);
    update.mutate({ ...values, phones });
  }

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <Card variant="form">
      <CardHeader>
        <CardTitle>Campus</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit(submitWithPhones)}>
          <FormField label="Nom du campus" required>
            <Input {...register("name")} />
          </FormField>
          <FormField label="Code du campus">
            <Input {...register("code")} />
          </FormField>
          <FormField label="Adresse">
            <Input {...register("address")} />
          </FormField>
          <FormField label="Téléphones (séparés par une virgule)">
            <Input value={phonesText} onChange={(e) => setPhonesText(e.target.value)} />
          </FormField>
          <FormField label="E-mail">
            <Input {...register("email")} />
          </FormField>
          <FormField label="Responsable du campus">
            <Select {...register("managerUserId")}>
              <option value="">—</option>
              {(usersQuery.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Latitude GPS (facultatif)">
            <Input type="number" step="any" {...register("gpsLatitude", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Longitude GPS (facultatif)">
            <Input type="number" step="any" {...register("gpsLongitude", { valueAsNumber: true })} />
          </FormField>
          <div className="col-span-2">
            <ImageUpload
              label="Logo du campus (facultatif — utilisé sur les documents officiels)"
              currentImageUrl={resolveUploadUrl(query.data.logoPath)}
              isUploading={isUploadingLogo}
              onFileSelected={(file) => void handleLogoUpload(file)}
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
