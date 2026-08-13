import { documentTypeSchema, TIER1_DOCUMENT_TYPES, type DocumentCatalogEntryDto } from "@isac-erp/shared";
import * as brandingService from "../brandingService.js";
import { hasPermission } from "../../security/authorization.js";

/** Libellés d'affichage du catalogue complet (Tier 1 + Tier 2) — MODULE-09 §0.4/§1.4. */
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CARTE_ETUDIANT: "Carte d'étudiant",
  ATTESTATION: "Attestation (générique)",
  CERTIFICAT: "Certificat (générique)",
  BULLETIN: "Bulletin (générique)",
  RECU: "Reçu (générique)",
  FACTURE: "Facture",
  DIPLOME: "Diplôme",
  CONVOCATION: "Convocation",
  DECISION: "Décision (générique)",
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

/**
 * Restriction fine par type de document (2026-08-10, retour du porteur du projet) — un rôle qui a
 * `DOCUMENTS:LECTURE`/`CREATION` (accès général au générateur) ne doit pas forcément voir les
 * documents financiers/comptables (ex. Directeur des Études) : chaque type sensible est ici rattaché
 * à une permission supplémentaire précise, vérifiée en plus de la permission générale du module
 * DOCUMENTS. Un type absent de cette table reste gouverné uniquement par DOCUMENTS:LECTURE/CREATION,
 * comme avant.
 */
export const DOCUMENT_TYPE_EXTRA_PERMISSION: Partial<Record<string, string>> = {
  HISTORIQUE_PAIEMENTS: "PAIEMENTS:LECTURE",
  GRAND_LIVRE_CAISSE: "CAISSE:LECTURE",
  ETAT_RECETTES: "COMPTABILITE:LECTURE",
  JOURNAL_CAISSE: "CAISSE:LECTURE",
  SITUATION_CAISSE_JOURNALIERE: "CAISSE:LECTURE",
  BILAN: "COMPTABILITE:LECTURE",
  RECU: "PAIEMENTS:LECTURE",
  RECU_PAIEMENT: "PAIEMENTS:LECTURE",
  FACTURE: "COMPTABILITE:LECTURE",
  RAPPORT_CAISSE: "CAISSE:LECTURE",
  RAPPORT_FINANCIER: "RAPPORTS_FINANCIERS:LECTURE",
  RETARD_PAIEMENT: "PAIEMENTS:LECTURE",
  SITUATION_FINANCIERE: "PAIEMENTS:LECTURE",
  CARTE_PAIEMENT: "PAIEMENTS:LECTURE",
};

/** Catalogue complet pour l'écran de configuration (§1.4) — un enregistrement par type, indiquant s'il est réellement générable. */
export async function getDocumentCatalog(
  roleCode: string,
  grantedPermissionCodes: ReadonlySet<string>
): Promise<DocumentCatalogEntryDto[]> {
  const templates = await brandingService.listDocumentTemplates();
  const templatesByType = new Map(templates.map((t) => [t.documentType, t]));
  const tier1Set = new Set<string>(TIER1_DOCUMENT_TYPES);

  return documentTypeSchema.options
    .filter((documentType) => {
      const extraPermission = DOCUMENT_TYPE_EXTRA_PERMISSION[documentType];
      return !extraPermission || hasPermission(roleCode, grantedPermissionCodes, extraPermission);
    })
    .map((documentType) => {
      const template = templatesByType.get(documentType);
      if (!template) {
        throw new Error(`Modèle de document manquant pour le type ${documentType} (seed incomplet).`);
      }
      return {
        documentType,
        label: DOCUMENT_TYPE_LABELS[documentType] ?? documentType,
        implemented: tier1Set.has(documentType),
        template,
      };
    });
}
