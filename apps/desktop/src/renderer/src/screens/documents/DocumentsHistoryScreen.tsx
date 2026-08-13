import type { DocumentType } from "@isac-erp/shared";
import { TIER1_DOCUMENT_TYPES } from "@isac-erp/shared";
import { Card, CardContent, CardHeader, CardTitle, Select } from "@isac-erp/ui";
import { useState } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";

const TIER1_LABELS: Record<(typeof TIER1_DOCUMENT_TYPES)[number], string> = {
  CERTIFICAT_SCOLARITE: "Certificat de scolarité",
  ATTESTATION_INSCRIPTION: "Attestation d'inscription",
  CARTE_ETUDIANT: "Carte d'étudiant",
  ATTESTATION_TRAVAIL: "Attestation de travail",
  LISTE_ETUDIANTS: "Liste des étudiants",
  LISTE_ENSEIGNANTS: "Liste des enseignants",
  LISTE_CLASSES: "Liste des classes",
  FICHE_EMARGEMENT: "Fiche d'émargement",
  EMPLOI_DU_TEMPS: "Emploi du temps",
  HISTORIQUE_PAIEMENTS: "Historique des paiements",
  GRAND_LIVRE_CAISSE: "Grand livre de caisse",
  ETAT_RECETTES: "État des recettes",
  RAPPORT_CAISSE: "Rapport de caisse",
  JOURNAL_CAISSE: "Journal de caisse",
  SITUATION_CAISSE_JOURNALIERE: "Situation de caisse journalière",
  BILAN: "Bilan",
  FICHE_INSCRIPTION: "Fiche d'inscription",
  FICHE_INSCRIPTION_COMPLETEE: "Fiche d'inscription complétée",
  SANCTION: "Avis de sanction disciplinaire",
  RECU_PAIEMENT: "Reçu de paiement",
  BULLETIN_SALAIRE: "Bulletin de paie",
  FICHE_EMARGEMENT_ENSEIGNANT: "Fiche d'émargement mensuelle des enseignants",
  CONTRAT_CDD_ADMINISTRATIF: "Contrat à durée déterminée — Personnel administratif",
  CONTRAT_CDD_ENSEIGNANT: "Contrat à durée déterminée — Enseignant",
  CONTRAT_VACATION: "Contrat de vacation",
  RETARD_PAIEMENT: "Retards de paiement",
  SITUATION_FINANCIERE: "Situation financière",
};

/** Archive des documents générés (MODULE-09 §1.7) — consultation/réimpression/téléchargement, jamais de régénération. */
export function DocumentsHistoryScreen() {
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [search, setSearch] = useState("");

  const query = trpc.documents.list.useQuery({
    documentType: documentType || undefined,
    search: search || undefined,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des documents générés</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Select value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType | "")}>
            <option value="">Tous les types</option>
            {TIER1_DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {TIER1_LABELS[type]}
              </option>
            ))}
          </Select>
          <input
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Rechercher un numéro de document…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2">N° document</th>
              <th>Type</th>
              <th>Concerne</th>
              <th>Généré le</th>
              <th>Généré par</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((doc) => (
              <tr key={doc.id} className="border-b">
                <td className="py-2 font-medium">{doc.documentNumber}</td>
                <td>{TIER1_LABELS[doc.documentType as (typeof TIER1_DOCUMENT_TYPES)[number]] ?? doc.documentType}</td>
                <td>{doc.relatedEntityLabel ?? "—"}</td>
                <td>{new Date(doc.generatedAt).toLocaleString("fr-FR")}</td>
                <td>{doc.generatedByName ?? "—"}</td>
                <td>
                  <a
                    className="text-primary underline"
                    href={resolveUploadUrl(doc.filePath) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Télécharger
                  </a>
                </td>
              </tr>
            ))}
            {query.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  Aucun document généré pour ces critères.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
