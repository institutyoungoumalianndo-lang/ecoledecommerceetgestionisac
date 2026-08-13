import { prisma } from "@isac-erp/db";
import type { SettingsExport } from "@isac-erp/shared";
import { getEstablishmentSettings } from "./establishmentService.js";
import { getCampusSettings } from "./campusService.js";
import {
  getOfficialStamp,
  getThemeSettings,
  listDocumentSignatories,
  listDocumentTemplates,
} from "./brandingService.js";
import { listAcademicYears } from "./academicYearService.js";
import { listAcademicPeriods } from "./academicPeriodService.js";
import { listFilieres } from "./filiereService.js";
import { listLevels } from "./levelService.js";
import { getCurrencySettings, getRegionalSettings } from "./localizationService.js";

// Version applicative — simple constante pour l'instant, un vrai
// versionnement sémantique du produit sera introduit plus tard si besoin.
const APP_VERSION = "0.1.0";

/**
 * Export du paramétrage uniquement (MODULE-02 §3.17 / §1.4.4) — distinct
 * d'une sauvegarde complète de base de données (Module 11). Les classes ne
 * sont pas exportées (dérivées des années/filières/niveaux, redondantes).
 */
export async function exportSettings(): Promise<SettingsExport> {
  const [
    establishment,
    campus,
    signatories,
    officialStamp,
    academicYears,
    academicPeriods,
    filieres,
    levels,
    currency,
    regional,
    theme,
    documentTemplates,
  ] = await Promise.all([
    getEstablishmentSettings(),
    getCampusSettings(),
    listDocumentSignatories(),
    getOfficialStamp(),
    listAcademicYears(),
    listAcademicPeriods(),
    listFilieres(),
    listLevels(),
    getCurrencySettings(),
    getRegionalSettings(),
    getThemeSettings(),
    listDocumentTemplates(),
  ]);

  return {
    exportedAt: new Date(),
    appVersion: APP_VERSION,
    establishment,
    campus,
    signatories,
    officialStamp,
    academicYears,
    academicPeriods,
    filieres,
    levels,
    currency,
    regional,
    theme,
    documentTemplates,
  };
}

/**
 * Import/restauration — transaction atomique (tout ou rien), voir MODULE-02
 * §3.8. Remplace les tables singleton, met à jour signatories/templates par
 * upsert, et recrée les années/périodes/filières/niveaux par code/label
 * unique (upsert) pour rester idempotent en cas de ré-import.
 */
export async function importSettings(data: SettingsExport): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const establishment = await tx.establishmentSettings.findFirst();
    if (establishment) {
      await tx.establishmentSettings.update({ where: { id: establishment.id }, data: data.establishment });
    } else {
      await tx.establishmentSettings.create({ data: data.establishment });
    }

    const campus = await tx.campusSettings.findFirst();
    if (campus) {
      await tx.campusSettings.update({ where: { id: campus.id }, data: data.campus });
    } else {
      await tx.campusSettings.create({ data: data.campus });
    }

    const stamp = await tx.officialStamp.findFirst();
    if (stamp) {
      await tx.officialStamp.update({ where: { id: stamp.id }, data: data.officialStamp });
    } else {
      await tx.officialStamp.create({ data: data.officialStamp });
    }

    const theme = await tx.themeSettings.findFirst();
    if (theme) {
      await tx.themeSettings.update({ where: { id: theme.id }, data: data.theme });
    } else {
      await tx.themeSettings.create({ data: data.theme });
    }

    const currency = await tx.currencySettings.findFirst();
    if (currency) {
      await tx.currencySettings.update({ where: { id: currency.id }, data: data.currency });
    } else {
      await tx.currencySettings.create({ data: data.currency });
    }

    const regional = await tx.regionalSettings.findFirst();
    if (regional) {
      await tx.regionalSettings.update({ where: { id: regional.id }, data: data.regional });
    } else {
      await tx.regionalSettings.create({ data: data.regional });
    }

    for (const signatory of data.signatories) {
      await tx.documentSignatory.upsert({
        where: { roleCode: signatory.roleCode },
        update: signatory,
        create: signatory,
      });
    }

    for (const template of data.documentTemplates) {
      await tx.documentTemplate.upsert({
        where: { documentType: template.documentType },
        update: template,
        create: template,
      });
    }

    for (const level of data.levels) {
      await tx.level.upsert({
        where: { code: level.code },
        update: level,
        create: level,
      });
    }

    for (const filiere of data.filieres) {
      await tx.filiere.upsert({
        where: { code: filiere.code },
        update: filiere,
        create: filiere,
      });
    }

    for (const year of data.academicYears) {
      await tx.academicYear.upsert({
        where: { label: year.label },
        update: year,
        create: year,
      });
    }
  });
}
