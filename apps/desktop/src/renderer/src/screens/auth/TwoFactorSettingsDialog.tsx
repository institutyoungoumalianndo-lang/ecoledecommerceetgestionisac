import { Badge, Button, Dialog, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/**
 * Double authentification en libre-service (MODULE-11 §1.2) — statut, activation (secret TOTP + QR
 * code + confirmation d'un premier code + codes de récupération affichés une seule fois),
 * désactivation (mot de passe requis).
 */
export function TwoFactorSettingsDialog({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const statusQuery = trpc.twoFactor.status.useQuery();

  const [setupData, setSetupData] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");

  const startSetup = trpc.twoFactor.startSetup.useMutation({
    onSuccess: (data) => setSetupData({ qrCodeDataUrl: data.qrCodeDataUrl, secret: data.secret }),
  });
  const confirmSetup = trpc.twoFactor.confirmSetup.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.codes);
      setSetupData(null);
      setConfirmCode("");
      void utils.twoFactor.status.invalidate();
    },
  });
  const disable = trpc.twoFactor.disable.useMutation({
    onSuccess: () => {
      setDisablePassword("");
      void utils.twoFactor.status.invalidate();
    },
  });

  const isEnabled = statusQuery.data?.isEnabled ?? false;

  return (
    <Dialog open onClose={onClose} title="Double authentification">
      <div className="flex flex-col gap-4">
        {backupCodes ? (
          <div className="flex flex-col gap-3">
            <Badge variant="success">Double authentification activée</Badge>
            <p className="text-sm text-destructive">
              Notez ces codes de récupération dans un endroit sûr — ils ne seront plus jamais affichés. Chacun ne
              peut être utilisé qu'une seule fois, en cas de perte de votre appareil d'authentification.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3 font-mono text-sm">
              {backupCodes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setBackupCodes(null)}>J'ai noté mes codes</Button>
            </div>
          </div>
        ) : isEnabled ? (
          <div className="flex flex-col gap-3">
            <Badge variant="success">Double authentification activée</Badge>
            <p className="text-sm text-muted-foreground">
              Pour désactiver, confirmez votre mot de passe.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>Mot de passe</Label>
              <Input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} />
            </div>
            {disable.error && <p className="text-sm text-destructive">{disable.error.message}</p>}
            <div className="flex justify-end">
              <Button
                variant="destructive"
                disabled={!disablePassword || disable.isPending}
                onClick={() => disable.mutate({ password: disablePassword })}
              >
                {disable.isPending ? "Désactivation…" : "Désactiver"}
              </Button>
            </div>
          </div>
        ) : setupData ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Scannez ce QR code avec une application d'authentification (Google Authenticator, Authy...), puis
              saisissez le code à 6 chiffres généré pour confirmer.
            </p>
            <img src={setupData.qrCodeDataUrl} alt="QR code d'activation" className="mx-auto h-48 w-48" />
            <p className="text-center text-xs text-muted-foreground">
              Ou saisissez ce code manuellement : <span className="font-mono">{setupData.secret}</span>
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>Code à 6 chiffres</Label>
              <Input value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} maxLength={6} />
            </div>
            {confirmSetup.error && <p className="text-sm text-destructive">{confirmSetup.error.message}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSetupData(null)}>
                Annuler
              </Button>
              <Button
                disabled={confirmCode.length !== 6 || confirmSetup.isPending}
                onClick={() => confirmSetup.mutate({ code: confirmCode })}
              >
                {confirmSetup.isPending ? "Vérification…" : "Confirmer"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Badge variant="muted">Double authentification désactivée</Badge>
            <p className="text-sm text-muted-foreground">
              Ajoutez une couche de sécurité supplémentaire à votre compte avec une application d'authentification.
            </p>
            {startSetup.error && <p className="text-sm text-destructive">{startSetup.error.message}</p>}
            <div className="flex justify-end">
              <Button disabled={startSetup.isPending} onClick={() => startSetup.mutate()}>
                {startSetup.isPending ? "Génération…" : "Activer"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
