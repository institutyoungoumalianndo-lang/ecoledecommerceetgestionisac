import { zodResolver } from "@hookform/resolvers/zod";
import { type LoginInput, loginInputSchema } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, FormField, Input } from "@isac-erp/ui";
import { Lock, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../store/authStore";
import { TechnicalSettingsDialog } from "./TechnicalSettingsDialog";
import { ActivationScreen } from "./ActivationScreen";

export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const setSession = useAuthStore((s) => s.setSession);

  const establishment = trpc.establishment.get.useQuery();
  const campus = trpc.campus.get.useQuery();
  const login = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.status === "TWO_FACTOR_REQUIRED") {
        setPendingToken(data.pendingToken);
      } else {
        setSession(data.sessionToken, data.user, data.permissionCodes);
      }
    },
  });
  const verifyTwoFactor = trpc.auth.verifyTwoFactor.useMutation({
    onSuccess: (data) => setSession(data.sessionToken, data.user, data.permissionCodes),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema) });

  const appVersion = window.isacErp?.versions.app ?? "0.0.0";

  if (showActivation) {
    return <ActivationScreen onCancel={() => setShowActivation(false)} />;
  }

  if (pendingToken) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-muted p-8">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <h1 className="text-lg font-semibold">Double authentification</h1>
            <p className="text-sm text-muted-foreground">
              Saisissez le code à 6 chiffres de votre application d'authentification, ou l'un de vos codes de
              récupération.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                verifyTwoFactor.mutate({ pendingToken, code: twoFactorCode });
              }}
            >
              <FormField label="Code" required>
                <Input
                  autoFocus
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                />
              </FormField>
              {verifyTwoFactor.error && <p className="text-sm text-destructive">{verifyTwoFactor.error.message}</p>}
              <Button type="submit" disabled={verifyTwoFactor.isPending || !twoFactorCode}>
                {verifyTwoFactor.isPending ? "Vérification…" : "Valider"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPendingToken(null);
                  setTwoFactorCode("");
                }}
              >
                Retour
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted p-8">
      <Button
        variant="ghost"
        className="absolute right-4 top-4 text-muted-foreground"
        onClick={() => setSettingsOpen(true)}
      >
        Paramètres
      </Button>

      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          {establishment.data?.logoPrimaryPath && (
            <img
              src={resolveUploadUrl(establishment.data.logoPrimaryPath) ?? undefined}
              alt="Logo"
              className="mb-2 h-16 w-16 object-contain"
            />
          )}
          <h1 className="text-lg font-semibold">
            {establishment.data?.officialName || "ISAC ERP"}
          </h1>
          {campus.data?.name && <p className="text-sm text-muted-foreground">{campus.data.name}</p>}
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => login.mutate(values))}>
            <FormField label="Nom d'utilisateur" required error={errors.username?.message}>
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

            {login.error && <p className="text-sm text-destructive">{login.error.message}</p>}

            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Connexion…" : "Connexion"}
            </Button>
            <Button type="button" variant="outline" onClick={() => window.close()}>
              Quitter
            </Button>
            <button
              type="button"
              onClick={() => setShowActivation(true)}
              className="text-center text-xs text-window-foreground/70 underline"
            >
              J'ai une clé d'activation
            </button>
            <button
              type="button"
              disabled
              title="Disponible dans une prochaine version"
              className="text-center text-xs text-muted-foreground opacity-60"
            >
              Mot de passe oublié ?
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="absolute bottom-4 flex flex-col items-center gap-1">
        <p className="text-xs text-muted-foreground">Version {appVersion}</p>
        <button
          type="button"
          onClick={() => void window.isacErp.config.clearServerUrl().then(() => window.location.reload())}
          className="text-xs text-muted-foreground underline opacity-60 hover:opacity-100"
        >
          Changer de serveur
        </button>
      </div>

      <TechnicalSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
