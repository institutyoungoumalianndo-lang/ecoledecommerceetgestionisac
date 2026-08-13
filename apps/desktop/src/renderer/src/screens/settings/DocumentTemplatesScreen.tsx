import type { DocumentTemplateDto, DocumentType, SignatoryRole } from "@isac-erp/shared";
import { TIER1_DOCUMENT_TYPES } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CARTE_ETUDIANT: "Carte étudiant",
  ATTESTATION: "Attestation",
  CERTIFICAT: "Certificat",
  BULLETIN: "Bulletin",
  RECU: "Reçu",
  FACTURE: "Facture",
  DIPLOME: "Diplôme",
  CONVOCATION: "Convocation",
  DECISION: "Décision",
  // Module 9 — Tier 1 (voir MODULE-09 §0.4)
  CERTIFICAT_SCOLARITE: "Certificat de scolarité",
  ATTESTATION_INSCRIPTION: "Attestation d'inscription",
  ATTESTATION_TRAVAIL: "Attestation de travail",
  LISTE_ETUDIANTS: "Liste des étudiants",
  LISTE_ENSEIGNANTS: "Liste des enseignants",
  LISTE_CLASSES: "Liste des classes",
  FICHE_EMARGEMENT: "Fiche d'émargement",
  EMPLOI_DU_TEMPS: "Emploi du temps",
  HISTORIQUE_PAIEMENTS: "Historique des paiements",
  GRAND_LIVRE_CAISSE: "Grand livre de caisse",
  ETAT_RECETTES: "État des recettes",
  JOURNAL_CAISSE: "Journal de caisse",
  SITUATION_CAISSE_JOURNALIERE: "Situation de caisse journalière",
  BILAN: "Bilan",
  FICHE_INSCRIPTION: "Fiche d'inscription",
  FICHE_INSCRIPTION_COMPLETEE: "Fiche d'inscription complétée",
  SANCTION: "Avis de sanction disciplinaire",
  // Module 9 — Tier 2, catalogue seul
  CARTE_PAIEMENT: "Carte de paiement",
  ATTESTATION_FREQUENTATION: "Attestation de fréquentation",
  ATTESTATION_REUSSITE: "Attestation de réussite",
  ATTESTATION_STAGE: "Attestation de stage",
  ATTESTATION_SALAIRE: "Attestation de salaire",
  DECISION_AFFECTATION: "Décision d'affectation",
  RECU_PAIEMENT: "Reçu de paiement",
  BULLETIN_SALAIRE: "Bulletin de salaire",
  FICHE_EMARGEMENT_ENSEIGNANT: "Fiche d'émargement mensuelle des enseignants",
  CONTRAT_CDD_ADMINISTRATIF: "Contrat à durée déterminée — Personnel administratif",
  CONTRAT_CDD_ENSEIGNANT: "Contrat à durée déterminée — Enseignant",
  CONTRAT_VACATION: "Contrat de vacation",
  BULLETIN_NOTES: "Bulletin de notes",
  RELEVE_NOTES: "Relevé de notes",
  RAPPORT_CAISSE: "Rapport de caisse",
  RAPPORT_FINANCIER: "Rapport financier",
  PROCES_VERBAL: "Procès-verbal",
  RAPPORT_STATISTIQUE: "Rapport statistique",
  RETARD_PAIEMENT: "Retards de paiement",
  SITUATION_FINANCIERE: "Situation financière",
};

const TIER1_SET = new Set<string>(TIER1_DOCUMENT_TYPES);

const SIGNATORY_ROLE_LABELS: Record<SignatoryRole, string> = {
  DIRECTEUR_GENERAL: "Directeur Général",
  DIRECTEUR_CAMPUS: "Directeur de Campus",
  DIRECTEUR_ETUDES: "Directeur des Études",
  COMPTABLE: "Comptable",
  RESPONSABLE_ADMINISTRATIF: "Responsable Administratif",
};

/**
 * Modèles de documents (§3.16) — registre de configuration (quel
 * logo/signature/cachet s'applique), pas un éditeur visuel de mise en page
 * (portée confirmée avec le porteur du projet, MODULE-02 §1.4.1). Depuis le
 * Module 9, les types Tier 1 sont réellement générables (badge "Disponible") ;
 * les autres restent un registre en attente ("Bientôt disponible").
 */
export function DocumentTemplatesScreen() {
  const utils = trpc.useUtils();
  const query = trpc.branding.documentTemplates.list.useQuery();
  const update = trpc.branding.documentTemplates.update.useMutation({
    onSuccess: () => void utils.branding.documentTemplates.list.invalidate(),
  });

  return (
    <div className="flex flex-col gap-4">
      {(query.data ?? []).map((template) => (
        <TemplateCard key={template.documentType} template={template} onSave={(v) => update.mutate(v)} />
      ))}
    </div>
  );
}

function TemplateCard({
  template,
  onSave,
}: {
  template: DocumentTemplateDto;
  onSave: (values: DocumentTemplateDto) => void;
}) {
  const [draft, setDraft] = useState(template);
  const isImplemented = TIER1_SET.has(template.documentType);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{DOCUMENT_TYPE_LABELS[template.documentType]}</CardTitle>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isImplemented ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
          }`}
        >
          {isImplemented ? "Disponible" : "Bientôt disponible"}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.showLogoPrimary}
              onChange={(e) => setDraft((d) => ({ ...d, showLogoPrimary: e.target.checked }))}
            />
            Logo principal
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.showLogoSecondary}
              onChange={(e) => setDraft((d) => ({ ...d, showLogoSecondary: e.target.checked }))}
            />
            Logo secondaire
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.showCampusLogo}
              onChange={(e) => setDraft((d) => ({ ...d, showCampusLogo: e.target.checked }))}
            />
            Logo du campus
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.showStamp}
              onChange={(e) => setDraft((d) => ({ ...d, showStamp: e.target.checked }))}
            />
            Cachet officiel
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.showQrCode}
              onChange={(e) => setDraft((d) => ({ ...d, showQrCode: e.target.checked }))}
            />
            QR code
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Signataire</Label>
          <Select
            value={draft.signatoryRoleCode ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                signatoryRoleCode: (e.target.value || null) as SignatoryRole | null,
              }))
            }
          >
            <option value="">Aucun</option>
            {Object.entries(SIGNATORY_ROLE_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Texte de pied de page personnalisé</Label>
          <Input
            value={draft.customFooterText ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, customFooterText: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-2 border-t pt-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.allowDoubleExemplaire}
              onChange={(e) => setDraft((d) => ({ ...d, allowDoubleExemplaire: e.target.checked }))}
            />
            Imprimer deux exemplaires (Administration + copie destinataire)
          </label>
          {draft.allowDoubleExemplaire && (
            <div className="flex flex-col gap-1.5">
              <Label>Mention du second exemplaire</Label>
              <Input
                placeholder="Exemplaire Étudiant"
                value={draft.secondaryCopyLabel ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, secondaryCopyLabel: e.target.value }))}
              />
            </div>
          )}
        </div>
        <Button className="self-end" onClick={() => onSave(draft)}>
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
