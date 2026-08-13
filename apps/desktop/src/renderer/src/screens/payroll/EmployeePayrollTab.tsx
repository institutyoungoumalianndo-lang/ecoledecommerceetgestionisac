import { zodResolver } from "@hookform/resolvers/zod";
import { type EmployeeDto, type UpdateEmployeeInput, updateEmployeeInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, FormField, Input, Label, Select } from "@isac-erp/ui";
import { User } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Identité (si non lié à un enseignant) et rémunération — éditables ici (MODULE-08 §1.1/§1.3). */
export function EmployeePayrollTab({ employee }: { employee: EmployeeDto }) {
  const utils = trpc.useUtils();
  const canEdit = useHasPermission("PAIE_EMPLOYES:MODIFICATION");
  const categoriesQuery = trpc.employeeCategories.list.useQuery();
  const contractTypesQuery = trpc.teacherContractTypes.list.useQuery();

  const update = trpc.employees.update.useMutation({
    onSuccess: () => void utils.employees.getById.invalidate({ id: employee.id }),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<UpdateEmployeeInput>({ resolver: zodResolver(updateEmployeeInputSchema) });

  useEffect(() => {
    reset({
      ...employee,
      fixedMonthlySalary: employee.fixedMonthlySalary ?? undefined,
      hourlyRate: employee.hourlyRate ?? undefined,
    });
  }, [employee, reset]);

  const salaryMode = useWatch({ control, name: "salaryMode" });
  const isLinkedToTeacher = employee.isLinkedToTeacher;

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit((values) => update.mutate({ ...values, id: employee.id }))}>
      <Card variant="form">
        <CardHeader>
          <CardTitle>Poste</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Catégorie">
            <Select disabled={!canEdit} {...register("categoryId")}>
              {(categoriesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Département">
            <Input disabled={!canEdit} {...register("department")} />
          </FormField>
          <FormField label="Type de contrat">
            <Select disabled={!canEdit} {...register("contractTypeId")}>
              <option value="">—</option>
              {(contractTypesQuery.data ?? []).filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      {!isLinkedToTeacher && (
        <Card variant="form">
          <CardHeader>
            <CardTitle>Identité</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField label="Nom" required error={errors.lastName?.message}>
              <Input icon={User} disabled={!canEdit} {...register("lastName")} />
            </FormField>
            <FormField label="Prénom">
              <Input disabled={!canEdit} {...register("firstName")} />
            </FormField>
            <FormField label="Téléphone principal">
              <Input disabled={!canEdit} {...register("phonePrimary")} />
            </FormField>
            <FormField label="E-mail" error={errors.email?.message}>
              <Input type="email" disabled={!canEdit} {...register("email")} />
            </FormField>
            <FormField label="Adresse">
              <Input disabled={!canEdit} {...register("address")} />
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
            <FormField label="Pièce d'identité (n°)">
              <Input disabled={!canEdit} {...register("idNumber")} />
            </FormField>
          </CardContent>
        </Card>
      )}

      <Card variant="form">
        <CardHeader>
          <CardTitle>Rémunération</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <FormField label="Mode de rémunération">
            <Select disabled={!canEdit} {...register("salaryMode")}>
              <option value="FIXE">Salaire fixe</option>
              <option value="HORAIRE" disabled={!isLinkedToTeacher}>Selon les heures (enseignant uniquement)</option>
            </Select>
          </FormField>
          {salaryMode === "FIXE" && (
            <FormField label="Salaire mensuel fixe">
              <Input type="number" min="0" step="0.01" disabled={!canEdit} {...register("fixedMonthlySalary", { valueAsNumber: true })} />
            </FormField>
          )}
          {(salaryMode === "HORAIRE" || isLinkedToTeacher) && (
            <FormField label="Tarif horaire">
              <Input type="number" min="0" step="0.01" disabled={!canEdit} {...register("hourlyRate", { valueAsNumber: true })} />
            </FormField>
          )}
          {isLinkedToTeacher && salaryMode === "FIXE" && (
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox disabled={!canEdit} {...register("teachingHoursPaid")} />
              <Label>Les heures d'enseignement donnent droit à une rémunération complémentaire</Label>
            </div>
          )}
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
