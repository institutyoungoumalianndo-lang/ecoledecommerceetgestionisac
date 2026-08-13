import { PRINT_THEME_PRESETS, type UpdatePrintThemeSettingsInput } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, ColorPicker, Input, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

const FIELD_LABELS: { key: keyof UpdatePrintThemeSettingsInput; label: string }[] = [
  { key: "borderColor", label: "Couleur des bordures" },
  { key: "separatorColor", label: "Couleur des séparateurs" },
  { key: "titleColor", label: "Couleur des titres" },
  { key: "headerColor", label: "Couleur des en-têtes" },
  { key: "tableColor", label: "Couleur des tableaux" },
  { key: "primaryTextColor", label: "Couleur des textes principaux" },
  { key: "secondaryTextColor", label: "Couleur des textes secondaires" },
  { key: "boxColor", label: "Couleur des encadrés" },
  { key: "totalColor", label: "Couleur des totaux" },
  { key: "netAmountColor", label: "Couleur du montant « Net à payer »" },
  { key: "footerColor", label: "Couleur des pieds de page" },
];

/**
 * Moteur de thèmes d'impression : couleurs de TOUS les documents imprimables de l'ERP (bulletin
 * de paie, reçus, futurs certificats/attestations/factures...). Décorrélé de la personnalisation
 * graphique de l'application (ThemeScreen) — les documents officiels doivent rester lisibles en
 * noir/blanc quelle que soit la couleur de l'interface.
 */
export function PrintThemeScreen() {
  const utils = trpc.useUtils();
  const query = trpc.printThemeSettings.get.useQuery();
  const [draft, setDraft] = useState<UpdatePrintThemeSettingsInput>({});

  const update = trpc.printThemeSettings.update.useMutation({
    onSuccess: () => void utils.printThemeSettings.get.invalidate(),
  });

  useEffect(() => {
    if (query.data) setDraft(query.data);
  }, [query.data]);

  function applyPreset(colors: UpdatePrintThemeSettingsInput, presetLabel: string) {
    const next = { ...colors, presetLabel };
    setDraft(next);
    update.mutate(next);
  }

  function setColor(key: keyof UpdatePrintThemeSettingsInput, value: string) {
    setDraft((d) => ({ ...d, [key]: value, presetLabel: "Personnalisé" }));
  }

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thèmes d'impression</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Ces couleurs s'appliquent automatiquement à tous les documents imprimables de l'ERP
          (bulletin de paie, reçus de paiement, et tous les futurs documents). Thème actuel :{" "}
          <strong>{draft.presetLabel ?? query.data.presetLabel}</strong>.
        </p>

        <div className="flex flex-wrap gap-2">
          {PRINT_THEME_PRESETS.map((preset) => (
            <Button key={preset.code} variant="outline" onClick={() => applyPreset(preset.colors, preset.label)}>
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {FIELD_LABELS.map((field) => (
            <ColorPicker
              key={field.key}
              label={field.label}
              value={(draft[field.key] as string) ?? "#000000"}
              onChange={(v) => setColor(field.key, v)}
            />
          ))}
        </div>

        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold">Mise en page (Module 9 — moteur de documents officiels)</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Format du papier</Label>
              <Select
                value={draft.paperFormat ?? "A4"}
                onChange={(e) => setDraft((d) => ({ ...d, paperFormat: e.target.value as "A4" | "LETTRE" }))}
              >
                <option value="A4">A4</option>
                <option value="LETTRE">Lettre</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Orientation</Label>
              <Select
                value={draft.orientation ?? "PORTRAIT"}
                onChange={(e) => setDraft((d) => ({ ...d, orientation: e.target.value as "PORTRAIT" | "PAYSAGE" }))}
              >
                <option value="PORTRAIT">Portrait</option>
                <option value="PAYSAGE">Paysage</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Marges (mm)</Label>
              <Input
                type="number"
                min={5}
                value={draft.marginMm ?? 15}
                onChange={(e) => setDraft((d) => ({ ...d, marginMm: Number(e.target.value) }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Épaisseur des bordures (pt)</Label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={draft.borderWidthPt ?? 1}
                onChange={(e) => setDraft((d) => ({ ...d, borderWidthPt: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>

        {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
        <Button className="self-end" disabled={update.isPending} onClick={() => update.mutate(draft)}>
          {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}
