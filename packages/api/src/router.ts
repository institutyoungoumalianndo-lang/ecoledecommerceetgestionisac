import { healthCheckSchema } from "@isac-erp/shared";
import { prisma } from "@isac-erp/db";
import { authRouter } from "./routers/auth.js";
import { activationKeysRouter } from "./routers/activationKeys.js";
import { usersRouter } from "./routers/users.js";
import { rolesRouter } from "./routers/roles.js";
import { auditLogRouter } from "./routers/auditLog.js";
import { securitySettingsRouter } from "./routers/securitySettings.js";
import { establishmentRouter } from "./routers/establishment.js";
import { campusRouter } from "./routers/campus.js";
import { brandingRouter } from "./routers/branding.js";
import { academicYearsRouter } from "./routers/academicYears.js";
import { academicPeriodsRouter } from "./routers/academicPeriods.js";
import { filieresRouter } from "./routers/filieres.js";
import { levelsRouter } from "./routers/levels.js";
import { schoolClassesRouter } from "./routers/schoolClasses.js";
import { localizationRouter } from "./routers/localization.js";
import { settingsBackupRouter } from "./routers/settingsBackup.js";
import { studentsRouter } from "./routers/students.js";
import { guardiansRouter } from "./routers/guardians.js";
import { studentDocumentsRouter } from "./routers/studentDocuments.js";
import { studentEnrollmentsRouter } from "./routers/studentEnrollments.js";
import { studentImportRouter } from "./routers/studentImport.js";
import { studentNumberingRouter } from "./routers/studentNumbering.js";
import { enrollmentRegimesRouter } from "./routers/enrollmentRegimes.js";
import { enrollmentSettingsRouter } from "./routers/enrollmentSettings.js";
import { enrollmentsRouter } from "./routers/enrollments.js";
import { enrollmentImportRouter } from "./routers/enrollmentImport.js";
import { enrollmentNumberingRouter } from "./routers/enrollmentNumbering.js";
import { feeTypesRouter } from "./routers/feeTypes.js";
import { feeTariffsRouter } from "./routers/feeTariffs.js";
import { feeReductionsRouter } from "./routers/feeReductions.js";
import { feeSummaryRouter } from "./routers/feeSummary.js";
import { paymentMethodsRouter } from "./routers/paymentMethods.js";
import { cashRegistersRouter } from "./routers/cashRegisters.js";
import { cashRegisterSessionsRouter } from "./routers/cashRegisterSessions.js";
import { paymentsRouter } from "./routers/payments.js";
import { chartAccountsRouter } from "./routers/chartAccounts.js";
import { accountingPeriodsRouter } from "./routers/accountingPeriods.js";
import { journalEntriesRouter } from "./routers/journalEntries.js";
import { expenseCategoriesRouter } from "./routers/expenseCategories.js";
import { suppliersRouter } from "./routers/suppliers.js";
import { expensesRouter } from "./routers/expenses.js";
import { budgetsRouter } from "./routers/budgets.js";
import { financialReportsRouter } from "./routers/financialReports.js";
import { subjectsRouter } from "./routers/subjects.js";
import { teachingUnitsRouter } from "./routers/teachingUnits.js";
import { subjectOfferingsRouter } from "./routers/subjectOfferings.js";
import { pedagogicalValidationRouter } from "./routers/pedagogicalValidation.js";
import { pedagogicalDashboardRouter } from "./routers/pedagogicalDashboard.js";
import { homeDashboardRouter } from "./routers/homeDashboard.js";
import { globalSearchRouter } from "./routers/globalSearch.js";
import { subjectImportRouter } from "./routers/subjectImport.js";
import { teacherStatusesRouter } from "./routers/teacherStatuses.js";
import { teacherContractTypesRouter } from "./routers/teacherContractTypes.js";
import { teachersRouter } from "./routers/teachers.js";
import { teacherAssignmentsRouter } from "./routers/teacherAssignments.js";
import { teacherAvailabilityRouter } from "./routers/teacherAvailability.js";
import { teacherTrainingsRouter } from "./routers/teacherTrainings.js";
import { teacherDocumentsRouter } from "./routers/teacherDocuments.js";
import { teacherDashboardRouter } from "./routers/teacherDashboard.js";
import { employeeCategoriesRouter } from "./routers/employeeCategories.js";
import { payrollComponentTypesRouter } from "./routers/payrollComponentTypes.js";
import { employeesRouter } from "./routers/employees.js";
import { payPeriodsRouter } from "./routers/payPeriods.js";
import { salaryAdvancesRouter } from "./routers/salaryAdvances.js";
import { payrollLinesRouter } from "./routers/payrollLines.js";
import { payrollSettingsRouter } from "./routers/payrollSettings.js";
import { payrollDashboardRouter } from "./routers/payrollDashboard.js";
import { printThemeSettingsRouter } from "./routers/printThemeSettings.js";
import { evaluationSettingsRouter } from "./routers/evaluationSettings.js";
import { notesRouter } from "./routers/notes.js";
import { bulletinsPeriodeRouter } from "./routers/bulletinsPeriode.js";
import { bulletinsAnnuelsRouter } from "./routers/bulletinsAnnuels.js";
import { classementRouter } from "./routers/classement.js";
import { feuilleSaisieRouter } from "./routers/feuilleSaisie.js";
import { roomsRouter } from "./routers/rooms.js";
import { pedagogicalGroupsRouter } from "./routers/pedagogicalGroups.js";
import { seanceRecurrenceTemplatesRouter } from "./routers/seanceRecurrenceTemplates.js";
import { scheduleBuilderRouter } from "./routers/scheduleBuilder.js";
import { seancesRouter } from "./routers/seances.js";
import { communicationContactsRouter } from "./routers/communicationContacts.js";
import { messageTemplatesRouter } from "./routers/messageTemplates.js";
import { notificationEventConfigsRouter } from "./routers/notificationEventConfigs.js";
import { campaignsRouter } from "./routers/campaigns.js";
import { communicationMessagesRouter } from "./routers/communicationMessages.js";
import { internalNotificationsRouter } from "./routers/internalNotifications.js";
import { communicationGatewaySettingsRouter } from "./routers/communicationGatewaySettings.js";
import { communicationDashboardRouter } from "./routers/communicationDashboard.js";
import { documentsRouter } from "./routers/documents.js";
import { institutionalHeaderSettingsRouter } from "./routers/institutionalHeaderSettings.js";
import { studentCardsRouter } from "./routers/studentCards.js";
import { studentCardTemplateRouter } from "./routers/studentCardTemplate.js";
import { paymentCardsRouter } from "./routers/paymentCards.js";
import { sanctionsRouter } from "./routers/sanctions.js";
import { studentAbsencesRouter } from "./routers/studentAbsences.js";
import { rattrapageSessionsRouter } from "./routers/rattrapageSessions.js";
import { alertRulesRouter } from "./routers/alertRules.js";
import { decisionalReportsRouter } from "./routers/decisionalReports.js";
import { databaseBackupRouter } from "./routers/databaseBackup.js";
import { twoFactorRouter } from "./routers/twoFactor.js";
import { assetLocationsRouter } from "./routers/assetLocations.js";
import { assetCategoriesRouter } from "./routers/assetCategories.js";
import { assetsRouter } from "./routers/assets.js";
import { assetMaintenancesRouter } from "./routers/assetMaintenances.js";
import { bookCategoriesRouter } from "./routers/bookCategories.js";
import { booksRouter } from "./routers/books.js";
import { loansRouter } from "./routers/loans.js";
import { librarySettingsRouter } from "./routers/librarySettings.js";
import { digitalDocumentCategoriesRouter } from "./routers/digitalDocumentCategories.js";
import { digitalDocumentsRouter } from "./routers/digitalDocuments.js";
import { portalAuthRouter } from "./routers/portalAuth.js";
import { portalCredentialsRouter } from "./routers/portalCredentials.js";
import { portalStudentRouter } from "./routers/portalStudent.js";
import { portalGuardianRouter } from "./routers/portalGuardian.js";
import { portalTeacherRouter } from "./routers/portalTeacher.js";
import { publicProcedure, router } from "./trpc.js";

export const appRouter = router({
  health: router({
    /**
     * Vérifie la chaîne complète Electron -> API locale -> PostgreSQL.
     * Écrit puis relit une ligne technique dans system_health pour
     * s'assurer que la connexion DB est réellement fonctionnelle,
     * pas seulement configurée.
     */
    check: publicProcedure.output(healthCheckSchema).query(async () => {
      try {
        const entry = await prisma.systemHealth.create({ data: {} });
        return {
          status: "ok" as const,
          database: true,
          timestamp: entry.checkedAt.toISOString(),
        };
      } catch {
        return {
          status: "error" as const,
          database: false,
          timestamp: new Date().toISOString(),
        };
      }
    }),
  }),

  auth: authRouter,
  users: usersRouter,
  roles: rolesRouter,
  auditLog: auditLogRouter,
  securitySettings: securitySettingsRouter,

  // Module 2 — Paramètres généraux et configuration de l'établissement
  establishment: establishmentRouter,
  campus: campusRouter,
  branding: brandingRouter,
  academicYears: academicYearsRouter,
  academicPeriods: academicPeriodsRouter,
  filieres: filieresRouter,
  levels: levelsRouter,
  schoolClasses: schoolClassesRouter,
  localization: localizationRouter,
  settingsBackup: settingsBackupRouter,

  // Module 4 — Étudiants
  students: studentsRouter,
  guardians: guardiansRouter,
  studentDocuments: studentDocumentsRouter,
  studentEnrollments: studentEnrollmentsRouter,
  studentImport: studentImportRouter,
  studentNumbering: studentNumberingRouter,

  // Module 4.1 — Inscriptions et réinscriptions
  enrollmentRegimes: enrollmentRegimesRouter,
  enrollmentSettings: enrollmentSettingsRouter,
  enrollments: enrollmentsRouter,
  enrollmentImport: enrollmentImportRouter,
  enrollmentNumbering: enrollmentNumberingRouter,

  // Module 4.2 — Frais de scolarité
  feeTypes: feeTypesRouter,
  feeTariffs: feeTariffsRouter,
  feeReductions: feeReductionsRouter,
  feeSummary: feeSummaryRouter,

  // Module 4.3 — Paiements et gestion de la caisse
  paymentMethods: paymentMethodsRouter,
  cashRegisters: cashRegistersRouter,
  cashRegisterSessions: cashRegisterSessionsRouter,
  payments: paymentsRouter,

  // Module 7 — Comptabilité générale et gestion financière
  chartAccounts: chartAccountsRouter,
  accountingPeriods: accountingPeriodsRouter,
  journalEntries: journalEntriesRouter,
  expenseCategories: expenseCategoriesRouter,
  suppliers: suppliersRouter,
  expenses: expensesRouter,
  budgets: budgetsRouter,
  financialReports: financialReportsRouter,

  // Module 2.1 — Structure pédagogique
  subjects: subjectsRouter,
  teachingUnits: teachingUnitsRouter,
  subjectOfferings: subjectOfferingsRouter,
  pedagogicalValidation: pedagogicalValidationRouter,
  pedagogicalDashboard: pedagogicalDashboardRouter,
  homeDashboard: homeDashboardRouter,
  globalSearch: globalSearchRouter,
  subjectImport: subjectImportRouter,

  // Module 5 — Gestion des enseignants
  teacherStatuses: teacherStatusesRouter,
  teacherContractTypes: teacherContractTypesRouter,
  teachers: teachersRouter,
  teacherAssignments: teacherAssignmentsRouter,
  teacherAvailability: teacherAvailabilityRouter,
  teacherTrainings: teacherTrainingsRouter,
  teacherDocuments: teacherDocumentsRouter,
  teacherDashboard: teacherDashboardRouter,

  // Module 8 — Paie des enseignants et du personnel
  employeeCategories: employeeCategoriesRouter,
  payrollComponentTypes: payrollComponentTypesRouter,
  employees: employeesRouter,
  payPeriods: payPeriodsRouter,
  salaryAdvances: salaryAdvancesRouter,
  payrollLines: payrollLinesRouter,
  payrollSettings: payrollSettingsRouter,
  payrollDashboard: payrollDashboardRouter,
  printThemeSettings: printThemeSettingsRouter,

  // Module 6 — Évaluation (notes, bulletins, classement)
  evaluationSettings: evaluationSettingsRouter,
  notes: notesRouter,
  bulletinsPeriode: bulletinsPeriodeRouter,
  bulletinsAnnuels: bulletinsAnnuelsRouter,
  classement: classementRouter,
  feuilleSaisie: feuilleSaisieRouter,

  // Module 5.2 — Emploi du temps et pointage pédagogique (révise le Module 5.1)
  rooms: roomsRouter,
  pedagogicalGroups: pedagogicalGroupsRouter,
  seanceRecurrenceTemplates: seanceRecurrenceTemplatesRouter,
  scheduleBuilder: scheduleBuilderRouter,
  seances: seancesRouter,

  // Module 12 — Centre de Communication Intelligent
  communicationContacts: communicationContactsRouter,
  messageTemplates: messageTemplatesRouter,
  notificationEventConfigs: notificationEventConfigsRouter,
  campaigns: campaignsRouter,
  communicationMessages: communicationMessagesRouter,
  internalNotifications: internalNotificationsRouter,
  communicationGatewaySettings: communicationGatewaySettingsRouter,
  communicationDashboard: communicationDashboardRouter,

  // Module 9 — Moteur centralisé de documents officiels
  documents: documentsRouter,
  institutionalHeaderSettings: institutionalHeaderSettingsRouter,

  // Module 9.1 — Carte d'étudiant officielle
  studentCards: studentCardsRouter,
  studentCardTemplate: studentCardTemplateRouter,

  // Extension du 2026-07-30 — Carte de paiement (même modèle que la carte d'étudiant)
  paymentCards: paymentCardsRouter,
  sanctions: sanctionsRouter,
  studentAbsences: studentAbsencesRouter,
  rattrapageSessions: rattrapageSessionsRouter,

  // Module 10 — Tableau de bord & Rapports décisionnels
  alertRules: alertRulesRouter,
  decisionalReports: decisionalReportsRouter,

  // Module 11 — Sauvegarde, Sécurité avancée, Audit
  databaseBackup: databaseBackupRouter,
  twoFactor: twoFactorRouter,

  // Module 14 — Inventaire
  assetLocations: assetLocationsRouter,
  assetCategories: assetCategoriesRouter,
  assets: assetsRouter,
  assetMaintenances: assetMaintenancesRouter,

  // Module 13 — Bibliothèque
  bookCategories: bookCategoriesRouter,
  books: booksRouter,
  loans: loansRouter,
  librarySettings: librarySettingsRouter,
  digitalDocumentCategories: digitalDocumentCategoriesRouter,
  digitalDocuments: digitalDocumentsRouter,

  // Module 15 — Portail web (fondations + phase 2 lecture seule étudiant + phase 3 tuteur/enseignant)
  portalAuth: portalAuthRouter,
  portalCredentials: portalCredentialsRouter,
  portalStudent: portalStudentRouter,
  portalGuardian: portalGuardianRouter,
  portalTeacher: portalTeacherRouter,

  // Clés d'activation d'installation (2026-08-10, ADR-054)
  activationKeys: activationKeysRouter,
});

export type AppRouter = typeof appRouter;
