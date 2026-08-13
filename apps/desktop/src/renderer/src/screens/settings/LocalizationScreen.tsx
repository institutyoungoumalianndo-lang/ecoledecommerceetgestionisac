import { zodResolver } from "@hookform/resolvers/zod";
import {
  type UpdateCurrencySettingsInput,
  type UpdateRegionalSettingsInput,
  updateCurrencySettingsInputSchema,
  updateRegionalSettingsInputSchema,
} from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, Input } from "@isac-erp/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Devise (§3.13) et paramètres régionaux (§3.14). */
export function LocalizationScreen() {
  return (
    <div className="flex flex-col gap-6">
      <CurrencyCard />
      <RegionalCard />
    </div>
  );
}

function CurrencyCard() {
  const utils = trpc.useUtils();
  const query = trpc.localization.currency.get.useQuery();
  const update = trpc.localization.currency.update.useMutation({
    onSuccess: () => void utils.localization.currency.get.invalidate(),
  });
  const { register, handleSubmit, reset } = useForm<UpdateCurrencySettingsInput>({
    resolver: zodResolver(updateCurrencySettingsInputSchema),
  });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  if (!query.data) return null;

  return (
    <Card variant="form">
      <CardHeader>
        <CardTitle>Devise</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((v) => update.mutate(v))}>
          <FormField label="Code devise">
            <Input {...register("currencyCode")} />
          </FormField>
          <FormField label="Séparateur des milliers">
            <Input {...register("thousandsSeparator")} />
          </FormField>
          <FormField label="Nombre de décimales">
            <Input type="number" min={0} max={4} {...register("decimalCount", { valueAsNumber: true })} />
          </FormField>
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

function RegionalCard() {
  const utils = trpc.useUtils();
  const query = trpc.localization.regional.get.useQuery();
  const update = trpc.localization.regional.update.useMutation({
    onSuccess: () => void utils.localization.regional.get.invalidate(),
  });
  const { register, handleSubmit, reset } = useForm<UpdateRegionalSettingsInput>({
    resolver: zodResolver(updateRegionalSettingsInputSchema),
  });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  if (!query.data) return null;

  return (
    <Card variant="form">
      <CardHeader>
        <CardTitle>Paramètres régionaux</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((v) => update.mutate(v))}>
          <FormField label="Langue">
            <Input {...register("language")} disabled title="Interface en français uniquement pour cette version (ADR-008)" />
          </FormField>
          <FormField label="Fuseau horaire">
            <Input {...register("timezone")} />
          </FormField>
          <FormField label="Format de date">
            <Input {...register("dateFormat")} />
          </FormField>
          <FormField label="Format de l'heure">
            <Input {...register("timeFormat")} />
          </FormField>
          <FormField label="Premier jour de la semaine" hint="0 = dimanche">
            <Input type="number" min={0} max={6} {...register("firstDayOfWeek", { valueAsNumber: true })} />
          </FormField>
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
