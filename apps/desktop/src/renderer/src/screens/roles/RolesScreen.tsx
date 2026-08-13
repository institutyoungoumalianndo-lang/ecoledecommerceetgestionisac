import { zodResolver } from "@hookform/resolvers/zod";
import { createRoleInputSchema, type CreateRoleInput, type RoleDto } from "@isac-erp/shared";
import { Badge, Button, Dialog, FormField, Input } from "@isac-erp/ui";
import { ShieldPlus, Tag } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { PermissionMatrix } from "./PermissionMatrix";

export function RolesScreen() {
  const utils = trpc.useUtils();
  const rolesQuery = trpc.roles.list.useQuery();
  const permissionsQuery = trpc.roles.listPermissions.useQuery();

  const [selectedRole, setSelectedRole] = useState<RoleDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = useHasPermission("ROLES:CREATION");
  const canAdminister = useHasPermission("ROLES:ADMINISTRATION");
  const canDelete = useHasPermission("ROLES:SUPPRESSION");

  const createRole = trpc.roles.create.useMutation({
    onSuccess: () => {
      void utils.roles.list.invalidate();
      setCreateOpen(false);
    },
  });
  const assignPermissions = trpc.roles.assignPermissions.useMutation({
    onSuccess: (role) => {
      void utils.roles.list.invalidate();
      setSelectedRole(role);
    },
  });
  const deleteRole = trpc.roles.delete.useMutation({
    onSuccess: () => {
      void utils.roles.list.invalidate();
      setSelectedRole(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoleInput>({ resolver: zodResolver(createRoleInputSchema) });

  return (
    <div className="flex gap-6">
      <div className="flex w-64 flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Rôles</h1>
          {canCreate && (
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              +
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {(rolesQuery.data ?? []).map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className={
                "flex items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted " +
                (selectedRole?.id === role.id ? "bg-muted font-medium" : "")
              }
            >
              <span>{role.label}</span>
              {role.isSystem && <Badge variant="muted">Système</Badge>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {selectedRole ? (
          <div className="flex flex-col gap-4">
            <PermissionMatrix
              role={selectedRole}
              permissions={permissionsQuery.data ?? []}
              isSaving={assignPermissions.isPending}
              onSave={(permissionIds) =>
                canAdminister &&
                assignPermissions.mutate({ roleId: selectedRole.id, permissionIds })
              }
            />
            {canDelete && !selectedRole.isSystem && (
              <Button
                variant="destructive"
                className="self-start"
                onClick={() => {
                  if (window.confirm(`Supprimer le rôle ${selectedRole.label} ?`)) {
                    deleteRole.mutate({ id: selectedRole.id });
                  }
                }}
              >
                Supprimer ce rôle
              </Button>
            )}
            {deleteRole.error && <p className="text-sm text-destructive">{deleteRole.error.message}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sélectionnez un rôle à gauche.</p>
        )}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un rôle" icon={<ShieldPlus size={18} />}>
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => {
            createRole.mutate(values);
            reset();
          })}
        >
          <FormField label="Code" required error={errors.code?.message} hint="Ex. RESPONSABLE_LOGISTIQUE">
            <Input icon={Tag} placeholder="RESPONSABLE_LOGISTIQUE" {...register("code")} />
          </FormField>
          <FormField label="Libellé" required error={errors.label?.message}>
            <Input {...register("label")} />
          </FormField>
          {createRole.error && <p className="text-sm text-destructive">{createRole.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createRole.isPending}>
              {createRole.isPending ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
