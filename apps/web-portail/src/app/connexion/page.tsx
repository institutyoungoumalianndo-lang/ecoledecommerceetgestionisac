"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type PortalLoginInput, portalLoginInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, FormField, Input } from "@isac-erp/ui";
import { Lock, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../lib/trpc";
import { setPortalSessionToken } from "../../lib/session";

/** Connexion au portail (MODULE-15 §2.2/§3) — aucune auto-inscription, identifiants remis par le personnel. */
export default function ConnexionPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PortalLoginInput>({ resolver: zodResolver(portalLoginInputSchema) });

  async function onSubmit(values: PortalLoginInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await trpcClient.portalAuth.login.mutate(values);
      setPortalSessionToken(result.sessionToken);
      router.replace(result.mustChangePassword ? "/changer-mot-de-passe" : "/portail");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la connexion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <h1 className="text-lg font-semibold">Portail web ISAC</h1>
          <p className="text-sm text-window-foreground/70">Étudiants, tuteurs/parents et enseignants</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField label="Identifiant" required error={errors.username?.message}>
              <Input id="username" icon={User} autoFocus {...register("username")} />
            </FormField>
            <FormField label="Mot de passe" required error={errors.password?.message}>
              <div className="flex gap-2">
                <Input
                  id="password"
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  aria-invalid={Boolean(errors.password)}
                  {...register("password")}
                />
                <Button type="button" variant="outline" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? "Masquer" : "Afficher"}
                </Button>
              </div>
            </FormField>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Connexion…" : "Connexion"}
            </Button>
            <Link href="/admin/connexion" className="text-center text-xs text-window-foreground/70 underline">
              Vous êtes membre du personnel ? Connexion Super Administrateur
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
