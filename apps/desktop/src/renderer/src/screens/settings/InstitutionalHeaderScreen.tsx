import { zodResolver } from "@hookform/resolvers/zod";
import {
  type UpdateInstitutionalHeaderSettingsInput,
  updateInstitutionalHeaderSettingsInputSchema,
} from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, ColorPicker, FormField, Input, Select } from "@isac-erp/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/**
 * En-tête institutionnelle (MODULE-09 §1.1/§1.4) : République/devise nationale, école, institut,
 * slogan — jamais codée en dur, entièrement configurable par le Super Administrateur.
 */
export function InstitutionalHeaderScreen() {
  const utils = trpc.useUtils();
  const query = trpc.institutionalHeaderSettings.get.useQuery();
  const update = trpc.institutionalHeaderSettings.update.useMutation({
    onSuccess: () => void utils.institutionalHeaderSettings.get.invalidate(),
  });

  const { register, handleSubmit, reset, watch, setValue } = useForm<UpdateInstitutionalHeaderSettingsInput>({
    resolver: zodResolver(updateInstitutionalHeaderSettingsInputSchema),
  });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const values = watch();

  return (
    <Card variant="form">
      <CardHeader>
        <CardTitle>En-tête institutionnelle</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit((v) => update.mutate(v))}>
          <p className="text-sm text-muted-foreground">
            Affichée en tête de tous les documents officiels générés (certificats, attestations,
            listes...). Chaque ligne, sa couleur et sa mise en forme sont personnalisables.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Ligne « République »">
              <Input {...register("republicLine")} />
            </FormField>
            <ColorPicker
              label="Couleur"
              value={values.republicColor ?? "#000000"}
              onChange={(v) => setValue("republicColor", v)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Devise — 1er mot">
              <Input {...register("mottoPart1")} />
              <ColorPicker
                label="Couleur"
                value={values.mottoPart1Color ?? "#CE1126"}
                onChange={(v) => setValue("mottoPart1Color", v)}
              />
            </FormField>
            <FormField label="Devise — 2e mot">
              <Input {...register("mottoPart2")} />
              <ColorPicker
                label="Couleur"
                value={values.mottoPart2Color ?? "#FCD116"}
                onChange={(v) => setValue("mottoPart2Color", v)}
              />
            </FormField>
            <FormField label="Devise — 3e mot">
              <Input {...register("mottoPart3")} />
              <ColorPicker
                label="Couleur"
                value={values.mottoPart3Color ?? "#009460"}
                onChange={(v) => setValue("mottoPart3Color", v)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nom de l'école">
              <Input {...register("schoolNameLine")} />
            </FormField>
            <ColorPicker
              label="Couleur"
              value={values.schoolNameColor ?? "#1E3A8A"}
              onChange={(v) => setValue("schoolNameColor", v)}
            />
            <FormField label="Taille de police">
              <Input type="number" min={8} max={30} {...register("schoolNameFontSize", { valueAsNumber: true })} />
            </FormField>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Checkbox
                checked={values.schoolNameBold ?? true}
                onChange={(e) => setValue("schoolNameBold", e.target.checked)}
              />
              Gras
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nom de l'institut">
              <Input {...register("instituteNameLine")} />
            </FormField>
            <ColorPicker
              label="Couleur"
              value={values.instituteNameColor ?? "#7F1D1D"}
              onChange={(v) => setValue("instituteNameColor", v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Slogan">
              <Input {...register("taglineLine")} />
            </FormField>
            <ColorPicker
              label="Couleur"
              value={values.taglineColor ?? "#6B7280"}
              onChange={(v) => setValue("taglineColor", v)}
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Checkbox
                checked={values.taglineItalic ?? true}
                onChange={(e) => setValue("taglineItalic", e.target.checked)}
              />
              Italique
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t pt-4">
            <FormField label="Police">
              <Select {...register("fontFamily")}>
                <option value="Helvetica">Helvetica</option>
              </Select>
            </FormField>
            <FormField label="Espacement des lignes">
              <Input type="number" min={1} max={3} step={0.1} {...register("lineSpacing", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Alignement">
              <Select {...register("alignment")}>
                <option value="LEFT">Gauche</option>
                <option value="CENTER">Centré</option>
                <option value="RIGHT">Droite</option>
              </Select>
            </FormField>
          </div>

          {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
          <Button type="submit" className="self-end" disabled={update.isPending}>
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
