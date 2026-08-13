import { zodResolver } from "@hookform/resolvers/zod";
import { updateStudentNumberingSettingsInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, Input, Select } from "@isac-erp/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { trpc } from "../../lib/trpc";

const formSchema = updateStudentNumberingSettingsInputSchema.omit({ purpose: true });
type FormValues = z.infer<typeof formSchema>;

/** Génération du numéro d'inscription — gabarit configurable (MODULE-04.1 §1.3/§2.3), même moteur que le matricule. */
export function EnrollmentNumberingScreen() {
  const utils = trpc.useUtils();
  const query = trpc.enrollmentNumbering.get.useQuery();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  const update = trpc.enrollmentNumbering.update.useMutation({
    onSuccess: () => void utils.enrollmentNumbering.get.invalidate(),
  });

  const template = watch("template");
  const counterPadding = watch("counterPadding");

  const preview = trpc.enrollmentNumbering.previewNext.useQuery(
    { template: template ?? "", counterPadding: counterPadding ?? 0 },
    { enabled: Boolean(template) }
  );

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <Card variant="form">
      <CardHeader>
        <CardTitle>Numérotation des numéros d'inscription</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Distinct du matricule (permanent) — ce numéro est généré à chaque inscription/réinscription. Variables
          disponibles : <code>{"{FILIERE}"}</code>, <code>{"{COMPTEUR}"}</code>, <code>{"{SIGLE}"}</code>,{" "}
          <code>{"{AA}"}</code> / <code>{"{AAAA}"}</code>.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => update.mutate(values))}>
          <FormField label="Gabarit" required error={errors.template?.message}>
            <Input {...register("template")} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Réinitialisation du compteur">
              <Select {...register("resetPolicy")}>
                <option value="JAMAIS">Jamais (compteur global)</option>
                <option value="ANNUEL">Chaque année universitaire</option>
              </Select>
            </FormField>
            <FormField label="Zéros de remplissage du compteur">
              <Input type="number" min={0} max={10} {...register("counterPadding", { valueAsNumber: true })} />
            </FormField>
          </div>

          {preview.data && (
            <p className="text-sm">
              Aperçu du prochain numéro : <strong>{preview.data}</strong>
            </p>
          )}

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
