import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

/**
 * Réglages de sécurité (MODULE-01 §3.6, étendu Module 11 §1.2) — verrouillage de compte, expiration
 * de session, expiration de mot de passe (déjà existants), et politique de mot de passe renforcée
 * (nouveau) : longueur minimale et exigences de caractères, appliquées côté serveur à la création et
 * au changement de mot de passe. Aucun écran n'existait encore pour ces réglages avant ce module.
 */
export function SecuritySettingsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.securitySettings.get.useQuery();

  const [maxFailedLoginAttempts, setMaxFailedLoginAttempts] = useState("");
  const [accountLockoutMinutes, setAccountLockoutMinutes] = useState("");
  const [sessionInactivityTimeoutMin, setSessionInactivityTimeoutMin] = useState("");
  const [passwordExpirationEnabled, setPasswordExpirationEnabled] = useState(false);
  const [passwordExpirationDays, setPasswordExpirationDays] = useState("");
  const [passwordMinLength, setPasswordMinLength] = useState("");
  const [passwordRequireUppercase, setPasswordRequireUppercase] = useState(true);
  const [passwordRequireNumber, setPasswordRequireNumber] = useState(true);
  const [passwordRequireSymbol, setPasswordRequireSymbol] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setMaxFailedLoginAttempts(query.data.maxFailedLoginAttempts.toString());
    setAccountLockoutMinutes(query.data.accountLockoutMinutes.toString());
    setSessionInactivityTimeoutMin(query.data.sessionInactivityTimeoutMin.toString());
    setPasswordExpirationEnabled(query.data.passwordExpirationEnabled);
    setPasswordExpirationDays(query.data.passwordExpirationDays?.toString() ?? "");
    setPasswordMinLength(query.data.passwordMinLength.toString());
    setPasswordRequireUppercase(query.data.passwordRequireUppercase);
    setPasswordRequireNumber(query.data.passwordRequireNumber);
    setPasswordRequireSymbol(query.data.passwordRequireSymbol);
  }, [query.data]);

  const update = trpc.securitySettings.update.useMutation({
    onSuccess: () => void utils.securitySettings.get.invalidate(),
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Sécurité</h2>

      <Card>
        <CardHeader>
          <CardTitle>Verrouillage de compte et session</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Tentatives avant verrouillage</Label>
            <Input type="number" min={1} max={20} value={maxFailedLoginAttempts} onChange={(e) => setMaxFailedLoginAttempts(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Durée du verrouillage (minutes)</Label>
            <Input type="number" min={1} max={1440} value={accountLockoutMinutes} onChange={(e) => setAccountLockoutMinutes(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Expiration de session par inactivité (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={480}
              value={sessionInactivityTimeoutMin}
              onChange={(e) => setSessionInactivityTimeoutMin(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expiration du mot de passe</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={passwordExpirationEnabled} onChange={(e) => setPasswordExpirationEnabled(e.target.checked)} />
            <Label>Exiger un changement de mot de passe après un délai</Label>
          </div>
          {passwordExpirationEnabled && (
            <div className="w-fit">
              <div className="flex flex-col gap-1.5">
                <Label>Délai (jours)</Label>
                <Input type="number" min={1} max={365} value={passwordExpirationDays} onChange={(e) => setPasswordExpirationDays(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Politique de mot de passe</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Appliquée à la création d'un compte et au changement de mot de passe — jamais rétroactivement sur les
            mots de passe déjà en place.
          </p>
          <div className="w-fit">
            <div className="flex flex-col gap-1.5">
              <Label>Longueur minimale</Label>
              <Input type="number" min={6} max={64} value={passwordMinLength} onChange={(e) => setPasswordMinLength(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={passwordRequireUppercase} onChange={(e) => setPasswordRequireUppercase(e.target.checked)} />
              <Label>Exiger au moins une majuscule</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={passwordRequireNumber} onChange={(e) => setPasswordRequireNumber(e.target.checked)} />
              <Label>Exiger au moins un chiffre</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={passwordRequireSymbol} onChange={(e) => setPasswordRequireSymbol(e.target.checked)} />
              <Label>Exiger au moins un caractère spécial</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
      <div className="flex justify-end">
        <Button
          disabled={update.isPending}
          onClick={() =>
            update.mutate({
              maxFailedLoginAttempts: Number(maxFailedLoginAttempts),
              accountLockoutMinutes: Number(accountLockoutMinutes),
              sessionInactivityTimeoutMin: Number(sessionInactivityTimeoutMin),
              passwordExpirationEnabled,
              passwordExpirationDays: passwordExpirationEnabled ? Number(passwordExpirationDays) : null,
              passwordMinLength: Number(passwordMinLength),
              passwordRequireUppercase,
              passwordRequireNumber,
              passwordRequireSymbol,
            })
          }
        >
          {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
