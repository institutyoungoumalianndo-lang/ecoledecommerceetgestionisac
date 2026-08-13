import type { DocumentType } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, ImageUpload, Input, Label } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { resolveUploadUrl, uploadImage } from "../../lib/upload";
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
const ALL_DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

/** Cachet officiel (§3.6) : import, taille, position, documents concernés. */
export function StampScreen() {
  const utils = trpc.useUtils();
  const query = trpc.branding.stamp.get.useQuery();
  const [isUploading, setIsUploading] = useState(false);
  const [widthMm, setWidthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const [positionXMm, setPositionXMm] = useState("");
  const [positionYMm, setPositionYMm] = useState("");
  const [applicable, setApplicable] = useState<Set<DocumentType>>(new Set());

  const update = trpc.branding.stamp.update.useMutation({
    onSuccess: () => void utils.branding.stamp.get.invalidate(),
  });

  useEffect(() => {
    if (query.data) {
      setWidthMm(query.data.widthMm?.toString() ?? "");
      setHeightMm(query.data.heightMm?.toString() ?? "");
      setPositionXMm(query.data.positionXMm?.toString() ?? "");
      setPositionYMm(query.data.positionYMm?.toString() ?? "");
      setApplicable(new Set(query.data.applicableDocumentTypes));
    }
  }, [query.data]);

  async function handleUpload(file: File) {
    setIsUploading(true);
    try {
      const imagePath = await uploadImage(file);
      update.mutate({ imagePath });
    } finally {
      setIsUploading(false);
    }
  }

  function toggleDocumentType(type: DocumentType) {
    setApplicable((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function save() {
    update.mutate({
      widthMm: widthMm ? Number(widthMm) : null,
      heightMm: heightMm ? Number(heightMm) : null,
      positionXMm: positionXMm ? Number(positionXMm) : null,
      positionYMm: positionYMm ? Number(positionYMm) : null,
      applicableDocumentTypes: [...applicable],
    });
  }

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cachet officiel</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ImageUpload
          label="Cachet"
          currentImageUrl={resolveUploadUrl(query.data.imagePath)}
          isUploading={isUploading}
          onFileSelected={(file) => void handleUpload(file)}
        />
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Largeur (mm)</Label>
            <Input type="number" value={widthMm} onChange={(e) => setWidthMm(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Hauteur (mm)</Label>
            <Input type="number" value={heightMm} onChange={(e) => setHeightMm(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Position X (mm)</Label>
            <Input type="number" value={positionXMm} onChange={(e) => setPositionXMm(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Position Y (mm)</Label>
            <Input type="number" value={positionYMm} onChange={(e) => setPositionYMm(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Documents sur lesquels le cachet s'applique</Label>
          <div className="flex flex-wrap gap-4">
            {ALL_DOCUMENT_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <Checkbox checked={applicable.has(type)} onChange={() => toggleDocumentType(type)} />
                {DOCUMENT_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
        </div>
        <Button className="self-end" disabled={update.isPending} onClick={save}>
          {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}
