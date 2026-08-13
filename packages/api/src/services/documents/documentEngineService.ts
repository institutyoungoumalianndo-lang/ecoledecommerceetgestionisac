import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput, GeneratedDocumentDto, DocumentType, NumberingPurpose } from "@isac-erp/shared";
import { generateNumber } from "../matriculeService.js";
import { saveGeneratedDocument } from "../../uploads/storage.js";
import * as brandingService from "../brandingService.js";
import { getInstitutionalHeaderSettings } from "./institutionalHeaderSettingsService.js";
import { getPrintThemeSettings } from "../printThemeSettingsService.js";
import { getEstablishmentSettings } from "../establishmentService.js";
import { getCampusSettings } from "../campusService.js";
import { createInternalNotification } from "../internalNotificationService.js";
import {
  buildQrPayload,
  renderDocumentTitle,
  renderDocumentToBuffer,
  renderFooterOnAllPages,
  renderInstitutionalHeader,
  renderQrCode,
  renderSignatureAndStamp,
  type DocumentRenderContext,
} from "./pdfEngine.js";
import type { GeneratorResult } from "./generators/types.js";
import { generateCertificatScolarite } from "./generators/certificatScolarite.js";
import { generateAttestationInscription } from "./generators/attestationInscription.js";
import { generateCarteEtudiant } from "./generators/carteEtudiant.js";
import { generateAttestationTravail } from "./generators/attestationTravail.js";
import { generateListeEtudiants } from "./generators/listeEtudiants.js";
import { generateListeEnseignants } from "./generators/listeEnseignants.js";
import { generateListeClasses } from "./generators/listeClasses.js";
import { generateFicheEmargement } from "./generators/ficheEmargement.js";
import { generateEmploiDuTemps } from "./generators/emploiDuTemps.js";
import { generateHistoriquePaiements } from "./generators/historiquePaiements.js";
import { generateGrandLivreCaisse } from "./generators/grandLivreCaisse.js";
import { generateEtatRecettes } from "./generators/etatRecettes.js";
import { generateRapportCaisse } from "./generators/rapportCaisse.js";
import { generateJournalCaisse } from "./generators/journalCaisse.js";
import { generateSituationCaisseJournaliere } from "./generators/situationCaisseJournaliere.js";
import { generateBilan } from "./generators/bilan.js";
import { generateFicheInscription } from "./generators/ficheInscription.js";
import { generateFicheInscriptionCompletee } from "./generators/ficheInscriptionCompletee.js";
import { generateAvisSanction } from "./generators/avisSanction.js";
import { generateRecuPaiement } from "./generators/recuPaiement.js";
import { generateBulletinSalaire } from "./generators/bulletinSalaire.js";
import { generateFicheEmargementEnseignant } from "./generators/ficheEmargementEnseignant.js";
import { generateContratCddAdministratif } from "./generators/contratCddAdministratif.js";
import { generateContratCddEnseignant } from "./generators/contratCddEnseignant.js";
import { generateContratVacation } from "./generators/contratVacation.js";
import { generateRetardPaiement } from "./generators/retardPaiement.js";
import { generateSituationFinanciere } from "./generators/situationFinanciere.js";

/**
 * Moteur PDF centralisé (MODULE-09) : point d'entrée unique de génération, quel que soit le type de
 * document. Aucun autre service ne doit appeler `pdfkit` ni écrire dans `generated_documents`
 * directement (§16 : "aucun module ne devra générer directement ses propres PDF").
 */

const DOCUMENT_TITLES: Record<string, string> = {
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
  JOURNAL_CAISSE: "Journal de caisse",
  SITUATION_CAISSE_JOURNALIERE: "Situation de caisse journalière",
  BILAN: "Bilan",
  FICHE_INSCRIPTION: "Fiche d'inscription",
  // Titre imprimé volontairement identique à FICHE_INSCRIPTION ("Fiche d'inscription complétée"
  // alourdissait inutilement l'en-tête du document — retour du porteur du projet, 2026-08-03). Les
  // deux types restent distincts partout ailleurs (catalogue, historique, réglages) pour ne pas les
  // confondre côté administration.
  FICHE_INSCRIPTION_COMPLETEE: "Fiche d'inscription",
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

const RAPPORT_CAISSE_PERIOD_LABELS: Record<"JOUR" | "MOIS" | "ANNEE", string> = {
  JOUR: "Journalier",
  MOIS: "Mensuel",
  ANNEE: "Annuel",
};

const BILAN_PERIOD_LABELS: Record<"MOIS" | "SEMESTRE" | "ANNEE", string> = {
  MOIS: "Mensuel",
  SEMESTRE: "Semestriel",
  ANNEE: "Annuel",
};

/** Titre affiché — dynamique pour "Rapport de caisse" et "Bilan" (le libellé dépend de la période choisie). */
function resolveDocumentTitle(input: GenerateDocumentInput): string {
  if (input.documentType === "RAPPORT_CAISSE") {
    return `Rapport de caisse — ${RAPPORT_CAISSE_PERIOD_LABELS[input.period]}`;
  }
  if (input.documentType === "BILAN") {
    return `Bilan — ${BILAN_PERIOD_LABELS[input.period]}`;
  }
  return DOCUMENT_TITLES[input.documentType] ?? input.documentType;
}

/** Un type Tier 1 (implémenté) n'attend jamais academicYearId/filiereId pour sa série de numérotation propre — voir MODULE-09 §1.6. */
async function buildRenderContext(documentType: DocumentType): Promise<DocumentRenderContext> {
  const [header, printTheme, establishment, campus, templates, stamp, signatories] = await Promise.all([
    getInstitutionalHeaderSettings(),
    getPrintThemeSettings(),
    getEstablishmentSettings(),
    getCampusSettings(),
    brandingService.listDocumentTemplates(),
    brandingService.getOfficialStamp(),
    brandingService.listDocumentSignatories(),
  ]);

  const template = templates.find((t) => t.documentType === documentType);
  if (!template) {
    throw new Error(`Aucun modèle configuré pour le type de document ${documentType}.`);
  }
  const signatory = template.signatoryRoleCode
    ? (signatories.find((s) => s.roleCode === template.signatoryRoleCode) ?? null)
    : null;

  return { header, printTheme, establishment, campus, template, stamp, signatory };
}

async function runGenerator(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: GenerateDocumentInput
): Promise<GeneratorResult> {
  switch (input.documentType) {
    case "CERTIFICAT_SCOLARITE":
      return generateCertificatScolarite(doc, ctx, input);
    case "ATTESTATION_INSCRIPTION":
      return generateAttestationInscription(doc, ctx, input);
    case "CARTE_ETUDIANT":
      return generateCarteEtudiant(doc, ctx, input);
    case "ATTESTATION_TRAVAIL":
      return generateAttestationTravail(doc, ctx, input);
    case "LISTE_ETUDIANTS":
      return generateListeEtudiants(doc, ctx, input);
    case "LISTE_ENSEIGNANTS":
      return generateListeEnseignants(doc, ctx, input);
    case "LISTE_CLASSES":
      return generateListeClasses(doc, ctx, input);
    case "FICHE_EMARGEMENT":
      return generateFicheEmargement(doc, ctx, input);
    case "EMPLOI_DU_TEMPS":
      return generateEmploiDuTemps(doc, ctx, input);
    case "HISTORIQUE_PAIEMENTS":
      return generateHistoriquePaiements(doc, ctx, input);
    case "GRAND_LIVRE_CAISSE":
      return generateGrandLivreCaisse(doc, ctx, input);
    case "ETAT_RECETTES":
      return generateEtatRecettes(doc, ctx, input);
    case "RAPPORT_CAISSE":
      return generateRapportCaisse(doc, ctx, input);
    case "JOURNAL_CAISSE":
      return generateJournalCaisse(doc, ctx, input);
    case "SITUATION_CAISSE_JOURNALIERE":
      return generateSituationCaisseJournaliere(doc, ctx, input);
    case "BILAN":
      return generateBilan(doc, ctx, input);
    case "FICHE_INSCRIPTION":
      return generateFicheInscription(doc, ctx, input);
    case "FICHE_INSCRIPTION_COMPLETEE":
      return generateFicheInscriptionCompletee(doc, ctx, input);
    case "SANCTION":
      return generateAvisSanction(doc, ctx, input);
    case "RECU_PAIEMENT":
      return generateRecuPaiement(doc, ctx, input);
    case "BULLETIN_SALAIRE":
      return generateBulletinSalaire(doc, ctx, input);
    case "FICHE_EMARGEMENT_ENSEIGNANT":
      return generateFicheEmargementEnseignant(doc, ctx, input);
    case "CONTRAT_CDD_ADMINISTRATIF":
      return generateContratCddAdministratif(doc, ctx, input);
    case "CONTRAT_CDD_ENSEIGNANT":
      return generateContratCddEnseignant(doc, ctx, input);
    case "CONTRAT_VACATION":
      return generateContratVacation(doc, ctx, input);
    case "RETARD_PAIEMENT":
      return generateRetardPaiement(doc, ctx, input);
    case "SITUATION_FINANCIERE":
      return generateSituationFinanciere(doc, ctx, input);
  }
}

/**
 * Numéro de document Tier 1 = purpose NumberingPurpose de même nom (voir MODULE-09 §1.6), généré
 * dans une transaction courte, dédiée. Exception : RECU_PAIEMENT réutilise `Payment.receiptNumber`
 * (déjà attribué à l'encaissement, Module 4.3) plutôt que de consommer une nouvelle série — deux
 * numéros différents pour le même reçu serait trompeur (voir DocumentType.RECU_PAIEMENT dans
 * schema.prisma).
 */
async function resolveDocumentNumber(input: GenerateDocumentInput): Promise<string> {
  if (input.documentType === "RECU_PAIEMENT") {
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: input.paymentId } });
    return payment.receiptNumber;
  }
  const academicYearId = "academicYearId" in input ? input.academicYearId : undefined;
  return prisma.$transaction((tx) => generateNumber(tx, input.documentType as NumberingPurpose, { academicYearId }));
}

/** Entité liée pour les types Tier 1 "un document par entité" — voir `findIdempotentDocument`. */
function relatedEntityForIdempotency(input: GenerateDocumentInput): { type: string; id: string } | null {
  if (input.documentType === "RECU_PAIEMENT") return { type: "Payment", id: input.paymentId };
  if (input.documentType === "BULLETIN_SALAIRE") return { type: "PayrollLine", id: input.payrollLineId };
  return null;
}

/**
 * Libellé lisible de l'entité liée à un document archivé (§1.7 — utilisé aussi bien par l'historique,
 * `generatedDocumentService.ts`, que par la vérification d'idempotence ci-dessous). Centralisé ici
 * (plutôt que dans generatedDocumentService.ts) pour éviter un import circulaire : ce fichier a
 * besoin de la même résolution avant même d'archiver un nouveau document.
 */
export async function resolveRelatedEntityLabel(relatedEntityType: string | null, relatedEntityId: string | null): Promise<string | null> {
  if (!relatedEntityType || !relatedEntityId) return null;
  switch (relatedEntityType) {
    case "Student": {
      const student = await prisma.student.findUnique({ where: { id: relatedEntityId } });
      return student ? `${student.firstName} ${student.lastName}` : null;
    }
    case "Employee": {
      const employee = await prisma.employee.findUnique({ where: { id: relatedEntityId }, include: { teacher: true } });
      if (!employee) return null;
      const source = employee.teacher ?? employee;
      return `${source.firstName ?? ""} ${source.lastName ?? ""}`.trim() || null;
    }
    case "Seance": {
      const seance = await prisma.seance.findUnique({
        where: { id: relatedEntityId },
        include: { subjectOffering: { include: { subject: true } } },
      });
      return seance ? `${seance.subjectOffering.subject.name} — ${seance.sessionDate.toLocaleDateString("fr-FR")}` : null;
    }
    case "AcademicYear": {
      const year = await prisma.academicYear.findUnique({ where: { id: relatedEntityId } });
      return year?.label ?? null;
    }
    case "Class": {
      const schoolClass = await prisma.class.findUnique({ where: { id: relatedEntityId } });
      return schoolClass?.name ?? null;
    }
    case "Teacher": {
      const teacher = await prisma.teacher.findUnique({ where: { id: relatedEntityId } });
      return teacher ? `${teacher.lastName} ${teacher.firstName}` : null;
    }
    case "Payment": {
      const payment = await prisma.payment.findUnique({ where: { id: relatedEntityId }, include: { student: true } });
      return payment ? `${payment.student.firstName} ${payment.student.lastName} — ${payment.student.matricule}` : null;
    }
    case "PayrollLine": {
      const line = await prisma.payrollLine.findUnique({ where: { id: relatedEntityId }, include: { payPeriod: true } });
      if (!line) return null;
      const employee = await prisma.employee.findUnique({ where: { id: line.employeeId }, include: { teacher: true } });
      const source = employee?.teacher ?? employee;
      const employeeName = source ? `${source.firstName ?? ""} ${source.lastName ?? ""}`.trim() : "";
      return `${employeeName} — ${String(line.payPeriod.month).padStart(2, "0")}/${line.payPeriod.year}`;
    }
    default:
      return null;
  }
}

/**
 * RECU_PAIEMENT/BULLETIN_SALAIRE (§3 règle 1 : jamais de régénération) — un seul document archivé par
 * paiement/ligne de paie, quel que soit le nombre de consultations. Contrairement aux autres types
 * Tier 1 (certificat, attestation...), pour lesquels une réémission délibérée est légitime et
 * n'appelle donc aucune vérification d'existence préalable.
 */
async function findIdempotentDocument(input: GenerateDocumentInput): Promise<GeneratedDocumentDto | null> {
  const related = relatedEntityForIdempotency(input);
  if (!related) return null;

  const row = await prisma.generatedDocument.findFirst({
    where: { documentType: input.documentType, relatedEntityType: related.type, relatedEntityId: related.id },
    include: { generatedByUser: true },
  });
  if (!row) return null;

  const label = await resolveRelatedEntityLabel(row.relatedEntityType, row.relatedEntityId);
  const generatedByName = row.generatedByUser ? `${row.generatedByUser.firstName} ${row.generatedByUser.lastName}` : null;
  return toGeneratedDocumentDto(row, label, generatedByName);
}

/** Marque en haut de page la copie en cours lors d'un double exemplaire (§15) — jamais pour les documents pleine page. */
function renderCopyLabel(doc: PDFKit.PDFDocument, label: string, color: string): void {
  doc
    .fontSize(8)
    .fillColor(color)
    .text(label.toUpperCase(), doc.page.margins.left, doc.page.margins.top - 12, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      align: "right",
    });
}

/**
 * Génère, archive et numérote un document Tier 1. Le double exemplaire (§15) produit deux pages
 * identiques dans le même fichier PDF ("Exemplaire Administration" puis "Exemplaire Étudiant/Employé") :
 * voir MODULE-09 §0.3 pour la justification de ce choix plutôt qu'une mise en page à deux volets sur
 * une seule feuille physique, non fiable avec un moteur de flux de texte générique.
 */
export async function generateDocument(
  input: GenerateDocumentInput,
  generatedByUserId: string | null
): Promise<GeneratedDocumentDto> {
  const existing = await findIdempotentDocument(input);
  if (existing) return existing;

  const ctx = await buildRenderContext(input.documentType);
  // Orientation forcée en paysage pour ce seul type de document (2026-08-02, retour du porteur du
  // projet : la colonne Matricule manquait de place en portrait) — `printTheme` est un réglage
  // global partagé par tous les documents (voir `buildRenderContext`), donc jamais modifié en place ;
  // un objet dérivé est substitué ici pour ne pas affecter les autres types de document.
  // EMPLOI_DU_TEMPS toujours en paysage depuis le 2026-08-06 (retour du porteur du projet, maquette
  // "Grille colorée par activité" — grille jours × créneaux, trop large pour tenir en portrait).
  // RETARD_PAIEMENT/SITUATION_FINANCIERE de même depuis le 2026-08-06 — tableaux à colonnes multiples
  // (étudiant/filière/niveau/tranche/montants), trop serrés en portrait. RECU_PAIEMENT est resté en
  // portrait (2026-08-09, retour du porteur du projet, après un essai en paysage jugé "trop élargi") —
  // son générateur calcule la mise en page des deux exemplaires empilés à partir des dimensions
  // réelles de la page, quelle que soit l'orientation.
  if (
    input.documentType === "LISTE_ETUDIANTS" ||
    input.documentType === "EMPLOI_DU_TEMPS" ||
    input.documentType === "RETARD_PAIEMENT" ||
    input.documentType === "SITUATION_FINANCIERE"
  ) {
    ctx.printTheme = { ...ctx.printTheme, orientation: "PAYSAGE" };
  }
  const wantsDoubleExemplaire =
    ctx.template.allowDoubleExemplaire && "doubleExemplaire" in input && input.doubleExemplaire === true;

  const documentNumber = await resolveDocumentNumber(input);
  const generationDate = new Date();

  let generatorResult: GeneratorResult | null = null;
  const buffer = await renderDocumentToBuffer(ctx, async (doc) => {
    const copies = wantsDoubleExemplaire ? [["Exemplaire Administration", "#374151"], [ctx.template.secondaryCopyLabel ?? "Exemplaire", "#374151"]] : [null];

    for (let i = 0; i < copies.length; i++) {
      if (i > 0) doc.addPage();
      const copy = copies[i];
      if (copy) renderCopyLabel(doc, copy[0]!, copy[1]!);

      // EMPLOI_DU_TEMPS dessine entièrement son propre en-tête (bandeau République/Ministère/Institut
      // bleu marine plein bord + séparateur doré + bandeau titre bleu), reproduisant à l'identique le
      // gabarit papier réel de l'établissement (2026-08-06, retour du porteur du projet) — le moteur
      // partagé (texte simple sur fond blanc) ne s'applique pas à ce type. RECU_PAIEMENT de même
      // depuis le 2026-08-09 : deux cadres compacts (logo + en-tête propre par exemplaire) occupent
      // toute la page paysage, sans place pour l'en-tête institutionnel complet ni un titre séparé.
      if (input.documentType !== "EMPLOI_DU_TEMPS" && input.documentType !== "RECU_PAIEMENT") {
        renderInstitutionalHeader(doc, ctx);
        // Position juste après l'en-tête institutionnel, avant le titre — voir DocumentRenderContext.headerBottomY
        // (2026-08-06, retour du porteur du projet : le cadre des contrats de travail ne doit entourer que
        // l'en-tête, pas le titre du document).
        ctx.headerBottomY = doc.y;
        // Espace supplémentaire avant le titre des 3 contrats de travail uniquement (2026-08-06, retour du
        // porteur du projet : le titre était trop collé au cadre de l'en-tête) — ne touche pas aux autres
        // types de document, qui partagent le même rendu de titre.
        if (
          input.documentType === "CONTRAT_CDD_ADMINISTRATIF" ||
          input.documentType === "CONTRAT_CDD_ENSEIGNANT" ||
          input.documentType === "CONTRAT_VACATION"
        ) {
          doc.y += 10;
        }
        renderDocumentTitle(
          doc,
          ctx,
          resolveDocumentTitle(input),
          `N° ${documentNumber}`,
          input.documentType === "ATTESTATION_INSCRIPTION" ? "Times-Bold" : undefined
        );
      }

      const result = await runGenerator(doc, ctx, input);
      if (i === 0) generatorResult = result;

      // FICHE_INSCRIPTION est un formulaire vierge signé à la main par l'étudiant/le parent — son
      // propre générateur dessine déjà une rangée de signature dédiée (Date / Signature étudiant /
      // Signature parent). Le cadre de signature institutionnel du moteur partagé ne s'applique pas ici
      // (aucun signataire de l'établissement n'est concerné) et casserait la tenue sur une seule page
      // (2026-08-02, retour du porteur du projet). FICHE_INSCRIPTION_COMPLETEE dessine de même sa propre
      // rangée à trois signatures (étudiant, Directeur des Études, Directeur — 2026-08-03).
      // FICHE_EMARGEMENT_ENSEIGNANT dessine de même son propre bloc VALIDATION (Enseignant/Chef de
      // département/Direction des Études — 2026-08-03, remplace le suivi numérique du pointage).
      // Les 3 contrats de travail (CONTRAT_CDD_ADMINISTRATIF/CONTRAT_CDD_ENSEIGNANT/CONTRAT_VACATION,
      // 2026-08-06) dessinent chacun leur propre bloc SIGNATURES à deux parties (Employeur/Salarié) —
      // le cadre de signature institutionnel à un seul signataire ne s'applique pas à un contrat bilatéral.
      // EMPLOI_DU_TEMPS dessine de même son propre bloc à trois signatures (Directeur des Études/Directeur
      // des Campus/Directeur Général, 2026-08-06, maquette réelle de l'établissement), dans les deux
      // modes (liste historique et grille par filière/niveau/module). RECU_PAIEMENT dessine de même sa
      // propre case "Signature et cachet" dans chacun des deux exemplaires (2026-08-09).
      if (
        input.documentType !== "FICHE_INSCRIPTION" &&
        input.documentType !== "FICHE_INSCRIPTION_COMPLETEE" &&
        input.documentType !== "FICHE_EMARGEMENT_ENSEIGNANT" &&
        input.documentType !== "CONTRAT_CDD_ADMINISTRATIF" &&
        input.documentType !== "CONTRAT_CDD_ENSEIGNANT" &&
        input.documentType !== "CONTRAT_VACATION" &&
        input.documentType !== "EMPLOI_DU_TEMPS" &&
        input.documentType !== "RECU_PAIEMENT"
      ) {
        // "Fait à ..." doit citer la ville réelle (Conakry), pas le libellé administratif interne du
        // campus (ex. "Campus principal") — voir CampusSettingsDto, qui n'a pas de champ ville dédié
        // (2026-07-30, retour du porteur du projet).
        renderSignatureAndStamp(doc, ctx, "Conakry");
      }

      // FICHE_INSCRIPTION n'a rien à vérifier par QR code (formulaire vierge, sans entité liée) et
      // l'espace était nécessaire ailleurs sur la page — retiré définitivement pour ce type plutôt que
      // laissé au réglage `showQrCode` du modèle (2026-08-03, retour du porteur du projet).
      // FICHE_EMARGEMENT_ENSEIGNANT est de même un formulaire interne à remplir à la main, sans besoin
      // de vérification externe par QR (2026-08-03). Les 3 contrats de travail n'en ont pas non plus
      // besoin (2026-08-06) : un contrat bilatéral s'authentifie par ses deux signatures, pas par QR.
      // EMPLOI_DU_TEMPS est un document interne de planification, même principe (2026-08-06).
      // RECU_PAIEMENT (2026-08-09) : les deux exemplaires détaillés occupent toute la page, sans place
      // pour un QR ; le reçu s'authentifie par son numéro, sa case signature/cachet et le montant en
      // toutes lettres.
      if (
        ctx.template.showQrCode &&
        input.documentType !== "FICHE_INSCRIPTION" &&
        input.documentType !== "FICHE_EMARGEMENT_ENSEIGNANT" &&
        input.documentType !== "CONTRAT_CDD_ADMINISTRATIF" &&
        input.documentType !== "CONTRAT_CDD_ENSEIGNANT" &&
        input.documentType !== "CONTRAT_VACATION" &&
        input.documentType !== "EMPLOI_DU_TEMPS" &&
        input.documentType !== "RECU_PAIEMENT"
      ) {
        await renderQrCode(doc, buildQrPayload(documentNumber, ctx.campus.name, generationDate, result.qrFields), documentNumber);
      }
    }

    renderFooterOnAllPages(doc, ctx, documentNumber);
  });

  if (!generatorResult) {
    throw new Error("La génération du document n'a produit aucun résultat.");
  }
  const result: GeneratorResult = generatorResult;

  const saved = await saveGeneratedDocument(buffer, documentNumber);
  const qrPayload = JSON.stringify(buildQrPayload(documentNumber, ctx.campus.name, generationDate, result.qrFields));

  const row = await prisma.generatedDocument.create({
    data: {
      documentType: input.documentType,
      documentNumber,
      relatedEntityType: result.relatedEntityType,
      relatedEntityId: result.relatedEntityId,
      filePath: saved.path,
      qrPayload: ctx.template.showQrCode ? qrPayload : null,
      doubleExemplaire: wantsDoubleExemplaire,
      generatedByUserId,
    },
  });

  // Centre de notifications (refonte UI/UX, phase finale, 2026-07-30) — confirmation interne pour
  // l'utilisateur qui a généré le document (absent pour les générations sans utilisateur identifié).
  if (generatedByUserId) {
    void createInternalNotification(
      generatedByUserId,
      "Document généré",
      `${DOCUMENT_TITLES[input.documentType]} — N° ${documentNumber}${result.relatedEntityLabel ? ` (${result.relatedEntityLabel})` : ""}.`,
      { type: "document", id: row.id }
    );
  }

  return toGeneratedDocumentDto(row, result.relatedEntityLabel, null);
}

export function toGeneratedDocumentDto(
  row: {
    id: string;
    documentType: string;
    documentNumber: string;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    filePath: string;
    qrPayload: string | null;
    doubleExemplaire: boolean;
    generatedByUserId: string | null;
    generatedAt: Date;
    createdAt: Date;
  },
  relatedEntityLabel: string | null,
  generatedByName: string | null
): GeneratedDocumentDto {
  return {
    id: row.id,
    documentType: row.documentType as DocumentType,
    documentNumber: row.documentNumber,
    relatedEntityType: row.relatedEntityType,
    relatedEntityId: row.relatedEntityId,
    relatedEntityLabel,
    filePath: row.filePath,
    qrPayload: row.qrPayload,
    doubleExemplaire: row.doubleExemplaire,
    generatedByUserId: row.generatedByUserId,
    generatedByName,
    generatedAt: row.generatedAt,
    createdAt: row.createdAt,
  };
}
