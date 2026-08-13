"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type LoginInput, loginInputSchema, SUPER_ADMIN_ROLE_CODE } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, FormField, Input } from "@isac-erp/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../../lib/trpc";
import { setStaffSessionToken } from "../../../lib/staffSession";

/**
 * Connexion Super Administrateur (MODULE-15 §1 décision 1) — réutilise le compte `User` existant du
 * personnel (mêmes identifiants que l'application desktop), jamais un `PortalCredential`. Réservé au
 * rôle Super Administrateur : un autre compte de personnel qui se connecte ici est immédiatement
 * déconnecté — accès complet au portail seulement pour le Super Administrateur (voir §1).
 */
export default function AdminConnexionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema) });

  async function finalizeSession(sessionToken: string, roleCode: string | undefined) {
    if (roleCode !== SUPER_ADMIN_ROLE_CODE) {
      setStaffSessionToken(sessionToken);
      await trpcClient.auth.logout.mutate().catch(() => {});
      setError("Ce portail est réservé, pour le personnel, au Super Administrateur.");
      return;
    }
    setStaffSessionToken(sessionToken);
    router.replace("/admin");
  }

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await trpcClient.auth.login.mutate(values);
      if (result.status === "TWO_FACTOR_REQUIRED") {
        setPendingToken(result.pendingToken);
      } else {
        await finalizeSession(result.sessionToken, result.user.role?.code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la connexion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmitTwoFactor() {
    if (!pendingToken) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await trpcClient.auth.verifyTwoFactor.mutate({ pendingToken, code: twoFactorCode });
      await finalizeSession(result.sessionToken, result.user.role?.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pendingToken) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <h1 className="text-lg font-semibold">Double authentification</h1>
            <p className="text-sm text-window-foreground/70">
              Saisissez le code à 6 chiffres de votre application d'authentification, ou un code de récupération.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void onSubmitTwoFactor();
              }}
            >
              <FormField label="Code" required>
                <Input autoFocus value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} />
              </FormField>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting || !twoFactorCode}>
                {isSubmitting ? "Vérification…" : "Valider"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <h1 className="text-lg font-semibold">Connexion personnel</h1>
          <p className="text-sm text-window-foreground/70">Réservé au Super Administrateur</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField label="Nom d'utilisateur" required error={errors.username?.message}>
              <Input id="username" autoFocus {...register("username")} />
            </FormField>
            <FormField label="Mot de passe" required error={errors.password?.message}>
              <Input id="password" type="password" {...register("password")} />
            </FormField>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Connexion…" : "Connexion"}
            </Button>
            <Link href="/connexion" className="text-center text-xs text-window-foreground/70 underline">
              Retour à la connexion étudiant/tuteur/enseignant
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
