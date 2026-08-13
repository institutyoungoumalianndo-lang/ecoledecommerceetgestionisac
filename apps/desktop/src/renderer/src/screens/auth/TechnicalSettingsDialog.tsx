import { type LoginInput, loginInputSchema } from "@isac-erp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, FormField, Input } from "@isac-erp/ui";
import { Lock, Settings, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/**
 * Bouton « Paramètres » de l'écran de connexion (quand un administrateur
 * existe déjà) : demande des identifiants administrateur, puis affiche
 * uniquement un panneau technique minimal — jamais les vrais écrans
 * Paramètres établissement (Module 2). Voir MODULE-01 §1.4.1.
 */
export function TechnicalSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [verified, setVerified] = useState(false);

  const verify = trpc.auth.verifyAdminCredentials.useMutation({ onSuccess: () => setVerified(true) });
  const health = trpc.health.check.useQuery(undefined, { enabled: verified, retry: 1 });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema) });

  function handleClose() {
    setVerified(false);
    verify.reset();
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Paramètres techniques"
      icon={<Settings size={18} />}
      description={
        verified
          ? "Diagnostic de connexion au serveur local."
          : "Accès réservé à l'administrateur."
      }
    >
      {!verified ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => verify.mutate(values))}
        >
          <FormField label="Nom d'utilisateur" required error={errors.username?.message}>
            <Input id="tech-username" icon={User} {...register("username")} />
          </FormField>
          <FormField label="Mot de passe" required error={errors.password?.message}>
            <Input id="tech-password" icon={Lock} type="password" {...register("password")} />
          </FormField>
          {verify.error && <p className="text-sm text-destructive">{verify.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={verify.isPending}>
              {verify.isPending ? "Vérification…" : "Valider"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
            <span>Connexion à la base de données</span>
            <span className={health.data?.status === "ok" ? "text-success" : "text-destructive"}>
              {health.isLoading ? "Vérification…" : health.data?.status === "ok" ? "Connectée" : "Indisponible"}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => health.refetch()} disabled={health.isFetching}>
              Retester
            </Button>
            <Button onClick={handleClose}>Fermer</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
