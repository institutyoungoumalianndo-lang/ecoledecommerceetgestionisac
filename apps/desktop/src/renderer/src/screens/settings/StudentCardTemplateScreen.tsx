import { zodResolver } from "@hookform/resolvers/zod";
import { type UpdateStudentCardTemplateInput, updateStudentCardTemplateInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, ColorPicker, FormField } from "@isac-erp/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Gabarit de la carte d'étudiant (MODULE-09.1 §2) : bandes tricolores, couleur de fond, mentions légales. */
export function StudentCardTemplateScreen() {
  const utils = trpc.useUtils();
  const query = trpc.studentCardTemplate.get.useQuery();
  const update = trpc.studentCardTemplate.update.useMutation({
    onSuccess: () => void utils.studentCardTemplate.get.invalidate(),
  });

  const { register, handleSubmit, reset, watch, setValue } = useForm<UpdateStudentCardTemplateInput>({
    resolver: zodResolver(updateStudentCardTemplateInputSchema),
  });

  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data, reset]);

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const values = watch();

  return (
    <Card variant="form">
      <CardHeader>
        <CardTitle>Modèle de la carte d'étudiant</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit((v) => update.mutate(v))}>
          <p className="text-sm text-muted-foreground">
            Personnalisation de la carte d'étudiant officielle (recto/verso, format 54×86mm) générée
            depuis la fiche de chaque étudiant.
          </p>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={values.showGuineaStripes ?? true}
              onChange={(e) => setValue("showGuineaStripes", e.target.checked)}
            />
            Afficher les bandes tricolores de la Guinée
          </label>

          <ColorPicker
            label="Couleur de fond"
            value={values.backgroundColor ?? "#FFFFFF"}
            onChange={(v) => setValue("backgroundColor", v)}
          />

          <FormField label="Mention légale (verso)">
            <textarea
              className="flex min-h-20 w-full rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
              {...register("legalText")}
            />
          </FormField>

          <FormField label="Mention d'usage personnel">
            <textarea
              className="flex min-h-16 w-full rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
              {...register("personalUseText")}
            />
          </FormField>

          {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
          <Button type="submit" className="self-end" disabled={update.isPending}>
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
