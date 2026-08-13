import { z } from "zod";
import { documentTypeSchema } from "./branding.js";

/**
 * Document officiel généré et archivé par le moteur PDF centralisé (MODULE-09 §1.7-§1.8). Un document
 * généré n'est jamais modifié après coup — voir §3 règle 1 : une "réimpression" retélécharge le fichier
 * déjà archivé, jamais une régénération. `relatedEntityLabel`/`generatedByName` sont dénormalisés au
 * moment de la génération, comme `CommunicationMessage.recipientName`/`sentByName` au Module 12.
 */
export const generatedDocumentSchema = z.object({
  id: z.string().uuid(),
  documentType: documentTypeSchema,
  documentNumber: z.string(),
  relatedEntityType: z.string().nullable(),
  relatedEntityId: z.string().nullable(),
  relatedEntityLabel: z.string().nullable(),
  filePath: z.string(),
  qrPayload: z.string().nullable(),
  doubleExemplaire: z.boolean(),
  generatedByUserId: z.string().uuid().nullable(),
  generatedByName: z.string().nullable(),
  generatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});
export type GeneratedDocumentDto = z.infer<typeof generatedDocumentSchema>;

export const listGeneratedDocumentsInputSchema = z.object({
  documentType: documentTypeSchema.optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type ListGeneratedDocumentsInput = z.infer<typeof listGeneratedDocumentsInputSchema>;

const doubleExemplaireField = z.boolean().optional();

/** Une entrée discriminée par type de document — chaque type Tier 1 attend des références différentes (MODULE-09 §0.4). */
export const generateDocumentInputSchema = z.discriminatedUnion("documentType", [
  z.object({ documentType: z.literal("CERTIFICAT_SCOLARITE"), studentId: z.string().uuid(), doubleExemplaire: doubleExemplaireField }),
  z.object({ documentType: z.literal("ATTESTATION_INSCRIPTION"), studentId: z.string().uuid(), doubleExemplaire: doubleExemplaireField }),
  z.object({ documentType: z.literal("CARTE_ETUDIANT"), studentId: z.string().uuid() }),
  z.object({ documentType: z.literal("ATTESTATION_TRAVAIL"), employeeId: z.string().uuid(), doubleExemplaire: doubleExemplaireField }),
  z.object({
    documentType: z.literal("LISTE_ETUDIANTS"),
    academicYearId: z.string().uuid(),
    classId: z.string().uuid().optional(),
    filiereId: z.string().uuid().optional(),
    levelId: z.string().uuid().optional(),
  }),
  z.object({ documentType: z.literal("LISTE_ENSEIGNANTS"), statusCode: z.string().optional() }),
  z.object({ documentType: z.literal("LISTE_CLASSES"), academicYearId: z.string().uuid() }),
  z.object({ documentType: z.literal("FICHE_EMARGEMENT"), seanceId: z.string().uuid() }),
  z.object({
    documentType: z.literal("EMPLOI_DU_TEMPS"),
    classId: z.string().uuid().optional(),
    teacherId: z.string().uuid().optional(),
    // Grille complète par filière/niveau/module (2026-08-06, retour du porteur du projet) — alternative
    // à classId/teacherId ci-dessus (conservés pour compatibilité avec les usages existants). Lue
    // depuis les mêmes modèles de récurrence (Module 5.2), regroupés par jour/heure sur toute la
    // semaine plutôt qu'en simple liste.
    filiereId: z.string().uuid().nullish(),
    levelId: z.string().uuid().optional(),
    periodId: z.string().uuid().optional(),
    academicYearId: z.string().uuid().optional(),
  }),
  z.object({ documentType: z.literal("HISTORIQUE_PAIEMENTS"), studentId: z.string().uuid(), academicYearId: z.string().uuid().optional() }),
  // Rapports comptables/de caisse — validés le 2026-07-30 (retour du porteur du projet), voir ADR-053.
  z.object({
    documentType: z.literal("GRAND_LIVRE_CAISSE"),
    accountId: z.string().uuid(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
  z.object({
    documentType: z.literal("ETAT_RECETTES"),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }),
  z.object({
    documentType: z.literal("RAPPORT_CAISSE"),
    period: z.enum(["JOUR", "MOIS", "ANNEE"]),
    date: z.coerce.date().optional(),
  }),
  z.object({ documentType: z.literal("JOURNAL_CAISSE"), cashRegisterSessionId: z.string().uuid() }),
  z.object({
    documentType: z.literal("SITUATION_CAISSE_JOURNALIERE"),
    cashRegisterId: z.string().uuid(),
    date: z.coerce.date().optional(),
  }),
  z.object({
    documentType: z.literal("BILAN"),
    period: z.enum(["MOIS", "SEMESTRE", "ANNEE"]),
    date: z.coerce.date().optional(),
  }),
  // Fiche d'inscription et de réinscription — formulaire vierge, sans entité liée (2026-08-02).
  z.object({ documentType: z.literal("FICHE_INSCRIPTION") }),
  // Fiche d'inscription complétée — version remplie depuis le dossier réel d'un étudiant (2026-08-03).
  z.object({ documentType: z.literal("FICHE_INSCRIPTION_COMPLETEE"), studentId: z.string().uuid() }),
  // Avis de sanction disciplinaire — lié à un étudiant et à la sanction enregistrée (2026-08-03).
  z.object({ documentType: z.literal("SANCTION"), studentId: z.string().uuid(), sanctionId: z.string().uuid() }),
  // Reçu de paiement et bulletin de paie — migrés du rendu window.print() vers le moteur PDF
  // centralisé le 2026-07-30. Idempotent : un deuxième appel pour le même paiement/bulletin renvoie
  // le document déjà archivé au lieu d'en générer un nouveau (voir documentEngineService.ts).
  z.object({ documentType: z.literal("RECU_PAIEMENT"), paymentId: z.string().uuid() }),
  z.object({ documentType: z.literal("BULLETIN_SALAIRE"), payrollLineId: z.string().uuid() }),
  // Fiche d'émargement mensuelle des enseignants (2026-08-03, retour du porteur du projet) — remplace
  // le suivi numérique des séances/pointage, abandonné. Formulaire mensuel à remplir à la main
  // (dates/heures/signatures), paramètres choisis à la génération plutôt que liés à une entité stockée.
  z.object({
    documentType: z.literal("FICHE_EMARGEMENT_ENSEIGNANT"),
    teacherId: z.string().uuid(),
    academicYearId: z.string().uuid(),
    month: z.number().int().min(1).max(12),
    // Vide accepté (génération en lot pour tous les enseignants actifs, où la matière diffère par
    // enseignant) — laissé à compléter à la main sur le document, comme Filière/Niveau/Classe.
    matiere: z.string(),
    volumeHorairePrevu: z.number().min(12).max(15),
  }),
  // Contrats de travail (2026-08-06, retour du porteur du projet) — l'établissement ne fonctionne
  // qu'en CDD (jamais de CDI). Le nom/la fonction du représentant légal et le lieu/date de signature
  // varient d'un contrat à l'autre (signataire différent selon le campus, date réelle de signature) :
  // saisis à la génération plutôt que stockés, même principe que matiere sur FICHE_EMARGEMENT_ENSEIGNANT.
  z.object({
    documentType: z.literal("CONTRAT_CDD_ADMINISTRATIF"),
    employeeId: z.string().uuid(),
    dateDebut: z.coerce.date(),
    dateFin: z.coerce.date(),
    representantLegalNom: z.string().min(1),
    representantLegalFonction: z.string().min(1),
    lieuSignature: z.string().min(1),
    dateSignature: z.coerce.date(),
  }),
  // CDD enseignant — durée = un module d'enseignement, sans période d'essai (recrutement direct),
  // rémunéré au taux horaire (modifiable d'un contrat à l'autre, voir MODULE-08 hourlyRate).
  z.object({
    documentType: z.literal("CONTRAT_CDD_ENSEIGNANT"),
    teacherId: z.string().uuid(),
    intituleModule: z.string().min(1),
    dateDebut: z.coerce.date(),
    dateFin: z.coerce.date(),
    tauxHoraire: z.number().positive(),
    representantLegalNom: z.string().min(1),
    representantLegalFonction: z.string().min(1),
    lieuSignature: z.string().min(1),
    dateSignature: z.coerce.date(),
  }),
  // Contrat de vacation — engagement plus léger que le CDD enseignant ci-dessus, sans lien de
  // subordination permanent, durée = une année scolaire, volume horaire mensuel prévisionnel.
  z.object({
    documentType: z.literal("CONTRAT_VACATION"),
    teacherId: z.string().uuid(),
    academicYearId: z.string().uuid(),
    volumeHoraireMensuel: z.number().positive(),
    tauxHoraire: z.number().positive(),
    representantLegalNom: z.string().min(1),
    representantLegalFonction: z.string().min(1),
    lieuSignature: z.string().min(1),
    dateSignature: z.coerce.date(),
  }),
  // Rapports financiers étudiants (2026-08-09, retour du porteur du projet) — filtrables par
  // filière/niveau/classe, toujours rattachés à une année universitaire (les échéances de tranche
  // sont résolues par FeeTariff, lui-même toujours scopé à une année, voir feeTariffService.ts).
  // RETARD_PAIEMENT n'affiche que les tranches échues et impayées ; installmentOrderIndex restreint
  // en plus à une tranche précise ("Tranche 2" par ex.) quand renseigné.
  z.object({
    documentType: z.literal("RETARD_PAIEMENT"),
    academicYearId: z.string().uuid(),
    filiereId: z.string().uuid().optional(),
    levelId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    installmentOrderIndex: z.number().int().min(1).optional(),
  }),
  // SITUATION_FINANCIERE affiche toutes les tranches (payées ou non) de chaque étudiant du périmètre,
  // avec un récapitulatif global — jamais limité aux seuls impayés (voir RETARD_PAIEMENT ci-dessus).
  z.object({
    documentType: z.literal("SITUATION_FINANCIERE"),
    academicYearId: z.string().uuid(),
    filiereId: z.string().uuid().optional(),
    levelId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
  }),
]);
export type GenerateDocumentInput = z.infer<typeof generateDocumentInputSchema>;

export const downloadGeneratedDocumentInputSchema = z.object({ id: z.string().uuid() });
