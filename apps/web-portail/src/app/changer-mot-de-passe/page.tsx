"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type PortalChangePasswordInput, portalChangePasswordInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, FormField, Input } from "@isac-erp/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../lib/trpc";
import { getPortalSessionToken } from "../../lib/session";

/** Changement de mot de passe obligatoire à la première connexion (MODULE-15 §2.2). */
export default function ChangerMotDePassePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getPortalSessionToken()) router.replace("/connexion");
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PortalChangePasswordInput>({ resolver: zodResolver(portalChangePasswordInputSchema) });

  async function onSubmit(values: PortalChangePasswordInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      await trpcClient.portalAuth.changePassword.mutate(values);
      router.replace("/portail");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du changement de mot de passe.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <h1 className="text-lg font-semibold">Changement de mot de passe requis</h1>
          <p className="text-sm text-window-foreground/70">
            Première connexion — choisissez un nouveau mot de passe avant de continuer.
          </p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField label="Mot de passe temporaire" required error={errors.currentPassword?.message}>
              <Input id="currentPassword" type="password" autoFocus {...register("currentPassword")} />
            </FormField>
            <FormField label="Nouveau mot de passe" required error={errors.newPassword?.message}>
              <Input id="newPassword" type="password" {...register("newPassword")} />
            </FormField>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement…" : "Valider"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
