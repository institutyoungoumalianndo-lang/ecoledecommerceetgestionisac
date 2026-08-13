import { zodResolver } from "@hookform/resolvers/zod";
import { type UpdateLibrarySettingsInput, updateLibrarySettingsInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, Input } from "@isac-erp/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Réglages de la bibliothèque (MODULE-13 §1.2) — durée d'emprunt par défaut et limite simultanée. */
export function LibrarySettingsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.librarySettings.get.useQuery();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateLibrarySettingsInput>({ resolver: zodResolver(updateLibrarySettingsInputSchema) });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  const update = trpc.librarySettings.update.useMutation({
    onSuccess: () => void utils.librarySettings.get.invalidate(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Réglages de la bibliothèque</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => update.mutate(values))}>
          <FormField label="Durée d'emprunt par défaut (jours)" error={errors.defaultLoanDurationDays?.message}>
            <Input type="number" min={1} max={365} {...register("defaultLoanDurationDays", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Nombre maximum d'emprunts simultanés par emprunteur" error={errors.maxSimultaneousLoans?.message}>
            <Input type="number" min={1} max={50} {...register("maxSimultaneousLoans", { valueAsNumber: true })} />
          </FormField>
          {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
