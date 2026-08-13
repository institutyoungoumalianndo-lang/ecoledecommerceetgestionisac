import { zodResolver } from "@hookform/resolvers/zod";
import { createFirstAdminInputSchema, type CreateFirstAdminInput } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, Input } from "@isac-erp/ui";
import { Lock, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

export function BootstrapScreen({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(false);
  const createFirstAdmin = trpc.auth.createFirstAdmin.useMutation({ onSuccess: () => setDone(true) });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFirstAdminInput>({ resolver: zodResolver(createFirstAdminInputSchema) });

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Compte administrateur créé</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Le premier compte (Super Administrateur) a été créé avec succès. Vous pouvez
              maintenant vous connecter.
            </p>
            <Button onClick={onDone}>Aller à la connexion</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configuration initiale — ISAC ERP</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Aucun administrateur n'existe encore sur cette installation. Créez le premier compte
            (Super Administrateur) pour commencer.
          </p>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => createFirstAdmin.mutate(values))}
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prénom" required error={errors.firstName?.message}>
                <Input id="firstName" icon={User} {...register("firstName")} />
              </FormField>
              <FormField label="Nom" required error={errors.lastName?.message}>
                <Input id="lastName" icon={User} {...register("lastName")} />
              </FormField>
            </div>
            <FormField label="Nom d'utilisateur" required error={errors.username?.message}>
              <Input id="username" icon={User} {...register("username")} />
            </FormField>
            <FormField label="Mot de passe" required error={errors.password?.message}>
              <Input id="password" icon={Lock} type="password" {...register("password")} />
            </FormField>
            {createFirstAdmin.error && (
              <p className="text-sm text-destructive">{createFirstAdmin.error.message}</p>
            )}
            <Button type="submit" disabled={createFirstAdmin.isPending}>
              {createFirstAdmin.isPending ? "Création…" : "Créer le compte administrateur"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
