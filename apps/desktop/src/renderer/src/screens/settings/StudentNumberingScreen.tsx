import { zodResolver } from "@hookform/resolvers/zod";
import { updateStudentNumberingSettingsInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, Input, Select } from "@isac-erp/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { trpc } from "../../lib/trpc";

const formSchema = updateStudentNumberingSettingsInputSchema.omit({ purpose: true });
type FormValues = z.infer<typeof formSchema>;

/** Génération du matricule étudiant — gabarit configurable (MODULE-04 §1.6). */
export function StudentNumberingScreen() {
  const utils = trpc.useUtils();
  const query = trpc.studentNumbering.get.useQuery();

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

  const update = trpc.studentNumbering.update.useMutation({
    onSuccess: () => void utils.studentNumbering.get.invalidate(),
  });

  const template = watch("template");
  const counterPadding = watch("counterPadding");

  const preview = trpc.studentNumbering.previewNext.useQuery(
    { template: template ?? "", counterPadding: counterPadding ?? 0 },
    { enabled: Boolean(template) }
  );

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <Card variant="form">
      <CardHeader>
        <CardTitle>Numérotation des matricules</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Variables disponibles : <code>{"{FILIERE}"}</code> (2 initiales de la filière),{" "}
          <code>{"{COMPTEUR}"}</code>, <code>{"{SIGLE}"}</code> (sigle de l'établissement),{" "}
          <code>{"{AA}"}</code> / <code>{"{AAAA}"}</code> (année universitaire).
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
              Aperçu du prochain matricule : <strong>{preview.data}</strong>
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
