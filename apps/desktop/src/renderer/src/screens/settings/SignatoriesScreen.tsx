import type { SignatoryRole } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, ImageUpload, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { resolveUploadUrl, uploadImage } from "../../lib/upload";
import { trpc } from "../../lib/trpc";

const ROLE_LABELS: Record<SignatoryRole, string> = {
  DIRECTEUR_GENERAL: "Directeur Général",
  DIRECTEUR_CAMPUS: "Directeur de Campus",
  DIRECTEUR_ETUDES: "Directeur des Études",
  COMPTABLE: "Comptable",
  RESPONSABLE_ADMINISTRATIF: "Responsable Administratif",
};

/** Signatures numérisées des 5 signataires (§3.5). */
export function SignatoriesScreen() {
  const utils = trpc.useUtils();
  const query = trpc.branding.signatories.list.useQuery();
  const [uploadingRole, setUploadingRole] = useState<SignatoryRole | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { displayName: string; title: string }>>({});

  const update = trpc.branding.signatories.update.useMutation({
    onSuccess: () => void utils.branding.signatories.list.invalidate(),
  });

  async function handleSignatureUpload(roleCode: SignatoryRole, file: File) {
    setUploadingRole(roleCode);
    try {
      const signatureImagePath = await uploadImage(file);
      await update.mutateAsync({ roleCode, signatureImagePath });
    } finally {
      setUploadingRole(null);
    }
  }

  function saveInfo(roleCode: SignatoryRole) {
    const draft = drafts[roleCode];
    if (!draft) return;
    update.mutate({ roleCode, displayName: draft.displayName, title: draft.title });
  }

  return (
    <div className="flex flex-col gap-4">
      {(query.data ?? []).map((signatory) => (
        <Card key={signatory.roleCode}>
          <CardHeader>
            <CardTitle>{ROLE_LABELS[signatory.roleCode]}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ImageUpload
              label="Signature"
              currentImageUrl={resolveUploadUrl(signatory.signatureImagePath)}
              isUploading={uploadingRole === signatory.roleCode}
              onFileSelected={(file) => void handleSignatureUpload(signatory.roleCode, file)}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Nom affiché</Label>
                <Input
                  defaultValue={signatory.displayName ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({
                      ...d,
                      [signatory.roleCode]: {
                        displayName: e.target.value,
                        title: d[signatory.roleCode]?.title ?? signatory.title ?? "",
                      },
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fonction affichée</Label>
                <Input
                  defaultValue={signatory.title ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({
                      ...d,
                      [signatory.roleCode]: {
                        displayName: d[signatory.roleCode]?.displayName ?? signatory.displayName ?? "",
                        title: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>
            <Button className="self-end" onClick={() => saveInfo(signatory.roleCode)}>
              Enregistrer
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
