import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateEmployeeInput, createEmployeeInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, FormField, Input, Label, Select } from "@isac-erp/ui";
import { User } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/**
 * Création d'un employé (MODULE-08 §1.1/§1.2) — sujet de paie unique, optionnellement lié à un
 * enseignant. `prefillTeacherId` (extension du 2026-07-30, pont Enseignant → Paie) présélectionne
 * l'enseignant quand on arrive depuis le bouton "Ajouter à la paie" de sa fiche.
 */
export function EmployeeFormScreen({
  onCancel,
  onCreated,
  prefillTeacherId,
}: {
  onCancel: () => void;
  onCreated: (employeeId: string) => void;
  prefillTeacherId?: string;
}) {
  const categoriesQuery = trpc.employeeCategories.list.useQuery();
  const contractTypesQuery = trpc.teacherContractTypes.list.useQuery();
  const teachersQuery = trpc.teachers.list.useQuery({ includeArchived: false, page: 1, pageSize: 200, sortBy: "lastName", sortDirection: "asc" });

  const create = trpc.employees.create.useMutation({ onSuccess: (employee) => onCreated(employee.id) });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeInputSchema),
    // Arrivée depuis "Ajouter à la paie" (fiche enseignant) : "Selon les heures" est présélectionné —
    // c'est le cas normal pour un enseignant, contrairement au personnel purement administratif
    // (2026-08-08, retour du porteur du projet). Reste "Salaire fixe" par défaut pour un employé créé
    // sans enseignant lié.
    defaultValues: {
      salaryMode: prefillTeacherId ? "HORAIRE" : "FIXE",
      teachingHoursPaid: false,
      teacherId: prefillTeacherId,
    },
  });

  // La catégorie est obligatoire : présélectionner la première plutôt que de laisser un "—"
  // vide qui bloque silencieusement la soumission tant que l'utilisateur ne l'a pas remarqué.
  useEffect(() => {
    const activeCategories = (categoriesQuery.data ?? []).filter((c) => c.isActive);
    if (activeCategories[0] && !getValues("categoryId")) {
      setValue("categoryId", activeCategories[0].id);
    }
  }, [categoriesQuery.data, getValues, setValue]);

  const teacherId = useWatch({ control, name: "teacherId" });
  const salaryMode = useWatch({ control, name: "salaryMode" });
  const isLinkedToTeacher = Boolean(teacherId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Nouvel employé</h2>
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit((values) => create.mutate(values))}>
        <Card variant="form">
          <CardHeader>
            <CardTitle>Poste</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField label="Catégorie" required error={errors.categoryId?.message}>
              <Select {...register("categoryId")}>
                <option value="">—</option>
                {(categoriesQuery.data ?? []).filter((c) => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Département">
              <Input {...register("department")} />
            </FormField>
            <FormField label="Type de contrat">
              <Select {...register("contractTypeId")}>
                <option value="">—</option>
                {(contractTypesQuery.data ?? []).filter((c) => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Lié à un enseignant (module Enseignants)">
              <Select {...register("teacherId")}>
                <option value="">— Aucun (personnel purement administratif) —</option>
                {(teachersQuery.data?.rows ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.lastName} {t.firstName} — {t.matricule}</option>
                ))}
              </Select>
            </FormField>
          </CardContent>
        </Card>

        {!isLinkedToTeacher && (
          <Card variant="form">
            <CardHeader>
              <CardTitle>Identité (non lié à un enseignant)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField label="Nom" required error={errors.lastName?.message}>
                <Input icon={User} {...register("lastName")} />
              </FormField>
              <FormField label="Prénom">
                <Input {...register("firstName")} />
              </FormField>
              <FormField label="Sexe">
                <Select {...register("gender")}>
                  <option value="">—</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </Select>
              </FormField>
              <FormField label="Date de recrutement">
                <Input type="date" {...register("hireDate")} />
              </FormField>
              <FormField label="Date de naissance">
                <Input type="date" {...register("birthDate")} />
              </FormField>
              <FormField label="Lieu de naissance">
                <Input {...register("birthPlace")} />
              </FormField>
              <FormField label="Nationalité">
                <Input {...register("nationality")} />
              </FormField>
              <FormField label="Pièce d'identité (n°)">
                <Input {...register("idNumber")} />
              </FormField>
              <FormField label="Téléphone principal">
                <Input {...register("phonePrimary")} />
              </FormField>
              <FormField label="Téléphone secondaire">
                <Input {...register("phoneSecondary")} />
              </FormField>
              <FormField label="E-mail" error={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </FormField>
              <FormField label="Adresse">
                <Input {...register("address")} />
              </FormField>
            </CardContent>
          </Card>
        )}

        <Card variant="form">
          <CardHeader>
            <CardTitle>Rémunération</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField label="Mode de rémunération" error={errors.salaryMode?.message}>
              <Select {...register("salaryMode")}>
                <option value="FIXE">Salaire fixe</option>
                <option value="HORAIRE" disabled={!isLinkedToTeacher}>Selon les heures (enseignant uniquement)</option>
              </Select>
            </FormField>
            {salaryMode === "FIXE" && (
              <FormField label="Salaire mensuel fixe" error={errors.fixedMonthlySalary?.message}>
                <Input type="number" min="0" step="0.01" {...register("fixedMonthlySalary", { valueAsNumber: true })} />
              </FormField>
            )}
            {(salaryMode === "HORAIRE" || isLinkedToTeacher) && (
              <FormField label="Tarif horaire">
                <Input type="number" min="0" step="0.01" {...register("hourlyRate", { valueAsNumber: true })} />
              </FormField>
            )}
            {isLinkedToTeacher && salaryMode === "FIXE" && (
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox {...register("teachingHoursPaid")} />
                <Label>Les heures d'enseignement donnent droit à une rémunération complémentaire (MODULE-08 §1.5)</Label>
              </div>
            )}
          </CardContent>
        </Card>

        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Enregistrement…" : "Créer l'employé"}
          </Button>
        </div>
      </form>
    </div>
  );
}
