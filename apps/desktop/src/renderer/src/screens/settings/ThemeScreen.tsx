import type { UpdateThemeSettingsInput } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, ColorPicker, ImageUpload, Input, Label } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { applyThemeColors } from "../../lib/color";
import { resolveUploadUrl, uploadImage } from "../../lib/upload";
import { trpc } from "../../lib/trpc";

const DEFAULT_COLORS = {
  primaryColor: "#0B1F44",
  secondaryColor: "#0284C7",
  buttonColor: "#0B1F44",
  menuColor: "#B9C7DC",
  // Même bleu que la couleur secondaire par défaut (celle des entêtes de tableau) — extension du
  // 2026-07-30, retour du porteur du projet : fond de toutes les fenêtres/cartes/boîtes de dialogue.
  windowColor: "#0284C7",
  // Couleurs par variante de bouton — extension du 2026-07-30, retour du porteur du projet : chaque
  // bouton réglable individuellement (jusqu'ici success/destructive/warning étaient fixes).
  // Adoucies le même jour (deuxième retour, sur capture d'écran du tableau de bord) pour
  // correspondre aux nouveaux tons par défaut de globals.css.
  destructiveColor: "#C24747",
  successColor: "#3A8857",
  warningColor: "#BE7F37",
};

/**
 * Personnalisation graphique (§3.15) : les couleurs s'appliquent en direct
 * (aperçu immédiat, avant même l'enregistrement — confirmé avec le porteur
 * du projet, voir MODULE-02 §1.4.3).
 */
export function ThemeScreen() {
  const utils = trpc.useUtils();
  const query = trpc.branding.theme.get.useQuery();
  const [draft, setDraft] = useState<UpdateThemeSettingsInput>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const update = trpc.branding.theme.update.useMutation({
    onSuccess: () => void utils.branding.theme.get.invalidate(),
  });

  useEffect(() => {
    if (query.data) setDraft(query.data);
  }, [query.data]);

  function setColor(key: keyof typeof DEFAULT_COLORS, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    applyThemeColors(next);
  }

  async function handleImageUpload(field: "loginImagePath" | "backgroundImagePath", file: File) {
    setUploadingField(field);
    try {
      const path = await uploadImage(file);
      const next = { ...draft, [field]: path };
      setDraft(next);
      update.mutate(next);
    } finally {
      setUploadingField(null);
    }
  }

  if (!query.data) return <p className="text-sm text-window-foreground/70">Chargement…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personnalisation graphique</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <ColorPicker
            label="Couleur principale"
            value={draft.primaryColor ?? DEFAULT_COLORS.primaryColor}
            onChange={(v) => setColor("primaryColor", v)}
          />
          <ColorPicker
            label="Couleur secondaire"
            value={draft.secondaryColor ?? DEFAULT_COLORS.secondaryColor}
            onChange={(v) => setColor("secondaryColor", v)}
          />
          <ColorPicker
            label="Couleur des boutons"
            value={draft.buttonColor ?? DEFAULT_COLORS.buttonColor}
            onChange={(v) => setColor("buttonColor", v)}
          />
          <ColorPicker
            label="Couleur du menu"
            value={draft.menuColor ?? DEFAULT_COLORS.menuColor}
            onChange={(v) => setColor("menuColor", v)}
          />
          <ColorPicker
            label="Couleur des fenêtres"
            value={draft.windowColor ?? DEFAULT_COLORS.windowColor}
            onChange={(v) => setColor("windowColor", v)}
          />
          <ColorPicker
            label="Couleur des boutons de suppression/annulation"
            value={draft.destructiveColor ?? DEFAULT_COLORS.destructiveColor}
            onChange={(v) => setColor("destructiveColor", v)}
          />
          <ColorPicker
            label="Couleur des boutons de validation"
            value={draft.successColor ?? DEFAULT_COLORS.successColor}
            onChange={(v) => setColor("successColor", v)}
          />
          <ColorPicker
            label="Couleur des boutons d'avertissement"
            value={draft.warningColor ?? DEFAULT_COLORS.warningColor}
            onChange={(v) => setColor("warningColor", v)}
          />
        </div>
        <p className="text-xs text-window-foreground/70">
          "Couleur des fenêtres" s'applique au fond de tous les panneaux/cartes/boîtes de dialogue de
          l'application — les zones de saisie et le contenu des tableaux restent toujours blancs.
        </p>

        <div className="flex flex-col gap-1.5">
          <Label>Police principale</Label>
          <Input
            value={draft.fontFamily ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, fontFamily: e.target.value }))}
            placeholder="Segoe UI"
          />
        </div>

        <ImageUpload
          label="Image de l'écran de connexion"
          currentImageUrl={resolveUploadUrl(draft.loginImagePath)}
          isUploading={uploadingField === "loginImagePath"}
          onFileSelected={(file) => void handleImageUpload("loginImagePath", file)}
        />
        <ImageUpload
          label="Image de fond"
          currentImageUrl={resolveUploadUrl(draft.backgroundImagePath)}
          isUploading={uploadingField === "backgroundImagePath"}
          onFileSelected={(file) => void handleImageUpload("backgroundImagePath", file)}
        />

        <Button className="self-end" disabled={update.isPending} onClick={() => update.mutate(draft)}>
          {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}
