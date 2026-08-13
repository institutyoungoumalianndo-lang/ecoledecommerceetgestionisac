import { zodResolver } from "@hookform/resolvers/zod";
import { type RedeemActivationKeyInput, redeemActivationKeyInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, FormField, Input } from "@isac-erp/ui";
import { KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../store/authStore";

/**
 * Première utilisation d'un poste avec une clé d'activation (2026-08-10, ADR-054) — la clé, fournie
 * par le Super Administrateur, crée le compte avec le rôle déjà choisi lors de sa génération
 * (`activationKeyService.generateActivationKeys`) et connecte immédiatement le collaborateur. La
 * clé ne ressert jamais ensuite : les connexions suivantes se font par identifiant/mot de passe
 * normal, comme tout autre compte (Module 1).
 */
export function ActivationScreen({ onCancel }: { onCancel: () => void }) {
  const setSession = useAuthStore((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RedeemActivationKeyInput>({ resolver: zodResolver(redeemActivationKeyInputSchema) });

  const redeem = trpc.activationKeys.redeem.useMutation({
    onSuccess: (data) => setSession(data.sessionToken, data.user, data.permissionCodes),
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <KeyRound className="mb-2" size={32} />
          <h1 className="text-lg font-semibold">Activer mon accès</h1>
          <p className="text-sm text-muted-foreground">
            Saisissez la clé d'activation fournie par votre Super Administrateur, puis créez vos identifiants.
          </p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => redeem.mutate(values))}>
            <FormField label="Clé d'activation" required error={errors.code?.message}>
              <Input autoFocus placeholder="XXXX-XXXX-XXXX" {...register("code")} />
            </FormField>
            <FormField label="Prénom" required error={errors.firstName?.message}>
              <Input {...register("firstName")} />
            </FormField>
            <FormField label="Nom" required error={errors.lastName?.message}>
              <Input {...register("lastName")} />
            </FormField>
            <FormField label="Nom d'utilisateur" required error={errors.username?.message}>
              <Input {...register("username")} />
            </FormField>
            <FormField label="Mot de passe" required error={errors.password?.message}>
              <Input type="password" {...register("password")} />
            </FormField>

            {redeem.error && <p className="text-sm text-destructive">{redeem.error.message}</p>}

            <Button type="submit" disabled={redeem.isPending}>
              {redeem.isPending ? "Activation…" : "Activer et se connecter"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Retour à la connexion
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
