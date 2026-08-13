import type { PublicUser } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { UserFormDialog } from "./UserFormDialog";

export function UsersScreen() {
  const utils = trpc.useUtils();
  const usersQuery = trpc.users.list.useQuery();
  const rolesQuery = trpc.roles.list.useQuery();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);

  const canCreate = useHasPermission("UTILISATEURS:CREATION");
  const canModify = useHasPermission("UTILISATEURS:MODIFICATION");
  const canAdminister = useHasPermission("UTILISATEURS:ADMINISTRATION");
  const canDelete = useHasPermission("UTILISATEURS:SUPPRESSION");

  function invalidate() {
    void utils.users.list.invalidate();
  }

  const createUser = trpc.users.create.useMutation({ onSuccess: () => { invalidate(); setFormOpen(false); } });
  const updateUser = trpc.users.update.useMutation({ onSuccess: () => { invalidate(); setFormOpen(false); } });
  const deactivateUser = trpc.users.deactivate.useMutation({ onSuccess: invalidate });
  const reactivateUser = trpc.users.reactivate.useMutation({ onSuccess: invalidate });
  const softDeleteUser = trpc.users.softDelete.useMutation({ onSuccess: invalidate });
  const resetPassword = trpc.users.resetPassword.useMutation({
    onSuccess: (result) => setResetPasswordResult(result.temporaryPassword),
  });
  const resetTwoFactor = trpc.users.resetTwoFactor.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<PublicUser>[] = [
    { key: "name", header: "Nom", value: (u) => `${u.lastName} ${u.firstName}` },
    { key: "username", header: "Nom d'utilisateur", value: (u) => u.username },
    { key: "role", header: "Rôle", value: (u) => u.role?.label ?? "—" },
    { key: "jobTitle", header: "Fonction", value: (u) => u.jobTitle ?? "—" },
    {
      key: "status",
      header: "Statut",
      value: (u) => (u.isActive ? "Actif" : "Inactif"),
      render: (u) => (
        <Badge variant={u.isActive ? "success" : "muted"}>{u.isActive ? "Actif" : "Inactif"}</Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Utilisateurs</h1>
        {canCreate && (
          <Button
            onClick={() => {
              setEditingUser(null);
              setFormOpen(true);
            }}
          >
            Nouvel utilisateur
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={usersQuery.data ?? []}
        getRowId={(u) => u.id}
        exportFilename="utilisateurs"
        emptyMessage={usersQuery.isLoading ? "Chargement…" : "Aucun utilisateur."}
        rowActions={(u) => (
          <div className="flex justify-end gap-2">
            {canModify && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingUser(u);
                  setFormOpen(true);
                }}
              >
                Modifier
              </Button>
            )}
            {canModify && (
              <Button variant="outline" onClick={() => resetPassword.mutate({ id: u.id })}>
                Réinitialiser
              </Button>
            )}
            {canAdminister && (
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm(`Réinitialiser la double authentification de ${u.firstName} ${u.lastName} ?`)) {
                    resetTwoFactor.mutate({ id: u.id });
                  }
                }}
              >
                Réinitialiser la 2FA
              </Button>
            )}
            {canAdminister && u.isActive && (
              <Button variant="destructive" onClick={() => deactivateUser.mutate({ id: u.id })}>
                Désactiver
              </Button>
            )}
            {canAdminister && !u.isActive && (
              <Button variant="success" onClick={() => reactivateUser.mutate({ id: u.id })}>
                Réactiver
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm(`Supprimer définitivement ${u.firstName} ${u.lastName} ?`)) {
                    softDeleteUser.mutate({ id: u.id });
                  }
                }}
              >
                Supprimer
              </Button>
            )}
          </div>
        )}
      />

      <UserFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingUser={editingUser}
        roles={rolesQuery.data ?? []}
        onCreate={(values) => createUser.mutate(values)}
        onUpdate={(values) => updateUser.mutate(values)}
        isSubmitting={createUser.isPending || updateUser.isPending}
        errorMessage={createUser.error?.message ?? updateUser.error?.message}
      />

      {resetPasswordResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border window-surface text-window-foreground p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">Mot de passe temporaire</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Communiquez ce mot de passe à l'utilisateur. Il devra le changer à sa prochaine
              connexion.
            </p>
            <p className="mb-4 rounded-md bg-muted p-3 text-center font-mono text-lg">
              {resetPasswordResult}
            </p>
            <Button className="w-full" onClick={() => setResetPasswordResult(null)}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
