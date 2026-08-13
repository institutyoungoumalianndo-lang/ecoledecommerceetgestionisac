import { zodResolver } from "@hookform/resolvers/zod";
import {
  type UpdateEstablishmentSettingsInput,
  updateEstablishmentSettingsInputSchema,
} from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, ImageUpload, Input, Label } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { resolveUploadUrl, uploadImage } from "../../lib/upload";
import { trpc } from "../../lib/trpc";

/** Établissement (§3.2), logos (§3.4) et informations administratives (§3.7). */
export function EstablishmentScreen() {
  const utils = trpc.useUtils();
  const query = trpc.establishment.get.useQuery();
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const update = trpc.establishment.update.useMutation({
    onSuccess: () => void utils.establishment.get.invalidate(),
  });

  const [phonesText, setPhonesText] = useState("");

  const { register, handleSubmit, reset } = useForm<UpdateEstablishmentSettingsInput>({
    resolver: zodResolver(updateEstablishmentSettingsInputSchema),
  });

  useEffect(() => {
    if (query.data) {
      reset(query.data);
      setPhonesText(query.data.phones.join(", "));
    }
  }, [query.data, reset]);

  function submitWithPhones(values: UpdateEstablishmentSettingsInput) {
    const phones = phonesText
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    update.mutate({ ...values, phones });
  }

  async function handleLogoUpload(field: "logoPrimaryPath" | "logoSecondaryPath" | "ministryLogoPath" | "faviconPath", file: File) {
    setUploadingField(field);
    try {
      const path = await uploadImage(file);
      await update.mutateAsync({ [field]: path });
    } finally {
      setUploadingField(null);
    }
  }

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Card variant="form">
        <CardHeader>
          <CardTitle>Établissement</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit(submitWithPhones)}>
            <FormField label="Nom officiel" required><Input {...register("officialName")} /></FormField>
            <FormField label="Sigle"><Input {...register("acronym")} /></FormField>
            <FormField label="Devise (motto)"><Input {...register("motto")} /></FormField>
            <FormField label="Slogan"><Input {...register("slogan")} /></FormField>
            <FormField label="Adresse"><Input {...register("address")} /></FormField>
            <FormField label="Ville"><Input {...register("city")} /></FormField>
            <FormField label="Préfecture"><Input {...register("prefecture")} /></FormField>
            <FormField label="Région"><Input {...register("region")} /></FormField>
            <FormField label="Pays"><Input {...register("country")} /></FormField>
            <FormField label="Téléphones (séparés par une virgule)">
              <Input value={phonesText} onChange={(e) => setPhonesText(e.target.value)} />
            </FormField>
            <FormField label="E-mail principal"><Input {...register("primaryEmail")} /></FormField>
            <FormField label="E-mail secondaire"><Input {...register("secondaryEmail")} /></FormField>
            <FormField label="Site web"><Input {...register("website")} /></FormField>
            <FormField label="Numéro d'autorisation"><Input {...register("authorizationNumber")} /></FormField>
            <FormField label="Numéro fiscal"><Input {...register("taxNumber")} /></FormField>
            <FormField label="Numéro RCCM"><Input {...register("rccmNumber")} /></FormField>
            <FormField label="Références administratives"><Input {...register("administrativeReferences")} /></FormField>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Mentions légales</Label>
              <textarea
                className="min-h-20 rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm"
                {...register("legalMentions")}
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

      <Card variant="form">
        <CardHeader>
          <CardTitle>Logos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ImageUpload
            label="Logo principal"
            currentImageUrl={resolveUploadUrl(query.data.logoPrimaryPath)}
            isUploading={uploadingField === "logoPrimaryPath"}
            onFileSelected={(file) => void handleLogoUpload("logoPrimaryPath", file)}
          />
          <ImageUpload
            label="Logo secondaire"
            currentImageUrl={resolveUploadUrl(query.data.logoSecondaryPath)}
            isUploading={uploadingField === "logoSecondaryPath"}
            onFileSelected={(file) => void handleLogoUpload("logoSecondaryPath", file)}
          />
          <ImageUpload
            label="Logo du ministère"
            currentImageUrl={resolveUploadUrl(query.data.ministryLogoPath)}
            isUploading={uploadingField === "ministryLogoPath"}
            onFileSelected={(file) => void handleLogoUpload("ministryLogoPath", file)}
          />
          <ImageUpload
            label="Favicon"
            currentImageUrl={resolveUploadUrl(query.data.faviconPath)}
            isUploading={uploadingField === "faviconPath"}
            onFileSelected={(file) => void handleLogoUpload("faviconPath", file)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
