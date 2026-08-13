import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreatePortalCredentialInput,
  createPortalCredentialInputSchema,
  DEFAULT_LOCAL_PORTAL_PORT,
  type PortalCredentialDto,
  SUPER_ADMIN_ROLE_CODE,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useAuthStore, useHasPermission } from "../../store/authStore";

const PRINCIPAL_TYPE_LABELS = { STUDENT: "Étudiant", GUARDIAN: "Tuteur/Parent", TEACHER: "Enseignant" } as const;
const CHANNEL_LABELS = { EMAIL: "E-mail", WHATSAPP: "WhatsApp" } as const;

/** URL locale du portail web (apps/web-portail) — voir DEFAULT_LOCAL_API_PORT pour le même principe côté backend. */
const PORTAL_WEB_URL = `http://localhost:${DEFAULT_LOCAL_PORTAL_PORT}`;

/** Gestion des comptes portail (MODULE-15 §2.2) — création côté personnel, jamais d'auto-inscription. */
export function PortalWebScreen() {
  const canAdminister = useHasPermission("PORTAIL_WEB:ADMINISTRATION");
  const canCreate = useHasPermission("PORTAIL_WEB:CREATION");
  const isSuperAdmin = useAuthStore((s) => s.user?.role?.code === SUPER_ADMIN_ROLE_CODE);
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);

  const query = trpc.portalCredentials.list.useQuery();

  const setActive = trpc.portalCredentials.setActive.useMutation({
    onSuccess: () => void utils.portalCredentials.list.invalidate(),
  });

  // Ouverture directe du portail Super Administrateur (2026-08-10, retour du porteur du projet) —
  // jeton à usage unique échangé contre une vraie session sur apps/web-portail/admin/sso, jamais un
  // mot de passe transmis en clair. Le lien s'ouvre dans le navigateur système (voir
  // apps/desktop/src/main/index.ts, setWindowOpenHandler → shell.openExternal), jamais dans l'app.
  const openPortalSso = trpc.auth.createPortalSsoToken.useMutation({
    onSuccess: ({ token }) => {
      window.open(`${PORTAL_WEB_URL}/admin/sso?token=${token}`, "_blank");
    },
  });

  const columns: DataTableColumn<PortalCredentialDto>[] = [
    { key: "displayName", header: "Titulaire", value: (c) => c.displayName },
    { key: "principalType", header: "Type", value: (c) => PRINCIPAL_TYPE_LABELS[c.principalType] },
    { key: "username", header: "Identifiant", value: (c) => c.username },
    {
      key: "mustChangePassword",
      header: "Mot de passe",
      value: (c) => (c.mustChangePassword ? "À changer" : "Défini"),
      render: (c) => <Badge variant={c.mustChangePassword ? "warning" : "success"}>{c.mustChangePassword ? "À changer" : "Défini"}</Badge>,
    },
    {
      key: "isActive",
      header: "Statut",
      value: (c) => (c.isActive ? "Actif" : "Désactivé"),
      render: (c) => <Badge variant={c.isActive ? "success" : "muted"}>{c.isActive ? "Actif" : "Désactivé"}</Badge>,
    },
    {
      key: "createdAt",
      header: "Créé le",
      value: (c) => c.createdAt.getTime(),
      render: (c) => c.createdAt.toLocaleDateString("fr-FR"),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Portail web — Comptes externes</h2>
          <p className="text-sm text-muted-foreground">
            Accès en lecture seule au portail pour les étudiants, tuteurs/parents et enseignants (campus pilote).
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Button
              variant="outline"
              disabled={openPortalSso.isPending}
              onClick={() => openPortalSso.mutate()}
            >
              {openPortalSso.isPending ? "Ouverture…" : "Ouvrir le portail (Super Administrateur)"}
            </Button>
          )}
          {canCreate && <Button onClick={() => setDialogOpen(true)}>Créer un compte</Button>}
        </div>
      </div>
      {openPortalSso.error && <p className="text-sm text-destructive">{openPortalSso.error.message}</p>}

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(c) => c.id}
        exportFilename="comptes-portail"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun compte portail créé."}
        rowActions={
          canAdminister
            ? (c) => (
                <Button
                  variant="outline"
                  disabled={setActive.isPending}
                  onClick={() => setActive.mutate({ id: c.id, isActive: !c.isActive })}
                >
                  {c.isActive ? "Désactiver" : "Réactiver"}
                </Button>
              )
            : undefined
        }
      />

      {dialogOpen && <CreatePortalCredentialDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function CreatePortalCredentialDialog({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const studentsQuery = trpc.students.list.useQuery({ pageSize: 200 });
  const teachersQuery = trpc.teachers.list.useQuery({ includeArchived: false, pageSize: 200 });
  const [guardianSearch, setGuardianSearch] = useState("");
  const guardiansQuery = trpc.guardians.search.useQuery(
    { search: guardianSearch },
    { enabled: guardianSearch.trim().length > 0 }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePortalCredentialInput>({
    resolver: zodResolver(createPortalCredentialInputSchema),
    defaultValues: { channel: "EMAIL" },
  });

  const create = trpc.portalCredentials.create.useMutation({
    onSuccess: (result) => {
      void utils.portalCredentials.list.invalidate();
      if (result.whatsappLink) {
        window.open(result.whatsappLink, "_blank");
      }
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Créer un compte portail">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
        <FormField label="Destinataire — étudiant" error={errors.studentId?.message}>
          <Select {...register("studentId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {studentsQuery.data?.rows.map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.matricule})</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Destinataire — enseignant" error={errors.teacherId?.message}>
          <Select {...register("teacherId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {teachersQuery.data?.rows.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.matricule})</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Destinataire — tuteur/parent (rechercher par nom)" error={errors.guardianId?.message}>
          <Input value={guardianSearch} onChange={(e) => setGuardianSearch(e.target.value)} placeholder="Nom du tuteur…" />
          <Select {...register("guardianId", { setValueAs: (v) => v || undefined })} className="mt-2">
            <option value="">Aucun</option>
            {guardiansQuery.data?.map((g) => (
              <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
            ))}
          </Select>
        </FormField>
        <p className="text-xs text-muted-foreground">Un seul destinataire à la fois — étudiant, tuteur ou enseignant.</p>

        <FormField label="Canal de remise du mot de passe temporaire" error={errors.channel?.message}>
          <Select {...register("channel")}>
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </FormField>

        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
            Annuler
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Création…" : "Créer le compte"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
