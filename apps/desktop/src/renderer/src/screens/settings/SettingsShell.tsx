import { Button } from "@isac-erp/ui";
import { useState } from "react";
import { hasPermission, useAuthStore } from "../../store/authStore";
import { AcademicYearsScreen } from "./AcademicYearsScreen";
import { BackupScreen } from "./BackupScreen";
import { CampusScreen } from "./CampusScreen";
import { ClassesScreen } from "./ClassesScreen";
import { CommunicationSettingsScreen } from "./CommunicationSettingsScreen";
import { DatabaseBackupScreen } from "./DatabaseBackupScreen";
import { DocumentTemplatesScreen } from "./DocumentTemplatesScreen";
import { EnrollmentNumberingScreen } from "./EnrollmentNumberingScreen";
import { EnrollmentRegimesScreen } from "./EnrollmentRegimesScreen";
import { EnrollmentSettingsScreen } from "./EnrollmentSettingsScreen";
import { EmployeeCategoriesScreen } from "./EmployeeCategoriesScreen";
import { EstablishmentScreen } from "./EstablishmentScreen";
import { EvaluationSettingsScreen } from "./EvaluationSettingsScreen";
import { FilieresScreen } from "./FilieresScreen";
import { InstitutionalHeaderScreen } from "./InstitutionalHeaderScreen";
import { LevelsScreen } from "./LevelsScreen";
import { LocalizationScreen } from "./LocalizationScreen";
import { PayrollComponentTypesScreen } from "./PayrollComponentTypesScreen";
import { PayrollSettingsScreen } from "./PayrollSettingsScreen";
import { PedagogicalDashboardScreen } from "./PedagogicalDashboardScreen";
import { PedagogicalGroupsScreen } from "./PedagogicalGroupsScreen";
import { PedagogicalValidationScreen } from "./PedagogicalValidationScreen";
import { PrintThemeScreen } from "./PrintThemeScreen";
import { RoomsScreen } from "./RoomsScreen";
import { SecuritySettingsScreen } from "./SecuritySettingsScreen";
import { SignatoriesScreen } from "./SignatoriesScreen";
import { StampScreen } from "./StampScreen";
import { StudentCardTemplateScreen } from "./StudentCardTemplateScreen";
import { StudentNumberingScreen } from "./StudentNumberingScreen";
import { SubjectOfferingsScreen } from "./SubjectOfferingsScreen";
import { SubjectsScreen } from "./SubjectsScreen";
import { TeacherContractTypesScreen } from "./TeacherContractTypesScreen";
import { TeacherStatusesScreen } from "./TeacherStatusesScreen";
import { TeachingUnitsScreen } from "./TeachingUnitsScreen";
import { ThemeScreen } from "./ThemeScreen";

export type SettingsSection =
  | "etablissement"
  | "campus"
  | "signatures"
  | "cachet"
  | "annees"
  | "filieres"
  | "niveaux"
  | "classes"
  | "localisation"
  | "apparence"
  | "modeles"
  | "sauvegarde"
  | "numerotation"
  | "regimes"
  | "reglages-inscriptions"
  | "numerotation-inscriptions"
  | "matieres"
  | "unites-enseignement"
  | "affectations-matieres"
  | "validation-pedagogique"
  | "tableau-bord-pedagogique"
  | "statuts-enseignants"
  | "types-contrat-enseignants"
  | "categories-employes"
  | "composants-paie"
  | "reglages-paie"
  | "themes-impression"
  | "reglages-evaluation"
  | "salles"
  | "groupes-pedagogiques"
  | "communication"
  | "en-tete-institutionnelle"
  | "modele-carte-etudiant"
  | "securite"
  | "sauvegarde-bdd";

const CATEGORIES: { title: string; items: { key: SettingsSection; label: string; permission: string }[] }[] = [
  {
    title: "Identité",
    items: [
      { key: "etablissement", label: "Établissement", permission: "ETABLISSEMENT:LECTURE" },
      { key: "campus", label: "Campus", permission: "CAMPUS:LECTURE" },
      { key: "signatures", label: "Signatures", permission: "SIGNATURES:LECTURE" },
      { key: "cachet", label: "Cachet officiel", permission: "CACHET:LECTURE" },
    ],
  },
  {
    title: "Structure académique",
    items: [
      { key: "annees", label: "Années universitaires", permission: "ANNEES:LECTURE" },
      { key: "filieres", label: "Filières", permission: "FILIERES:LECTURE" },
      { key: "niveaux", label: "Niveaux", permission: "NIVEAUX:LECTURE" },
      { key: "classes", label: "Classes", permission: "CLASSES:LECTURE" },
    ],
  },
  {
    title: "Régional & Devise",
    items: [{ key: "localisation", label: "Devise & régional", permission: "DEVISE:LECTURE" }],
  },
  {
    title: "Apparence",
    items: [
      { key: "apparence", label: "Personnalisation graphique", permission: "THEME:LECTURE" },
      { key: "themes-impression", label: "Thèmes d'impression", permission: "THEME:LECTURE" },
    ],
  },
  {
    title: "Documents",
    items: [
      { key: "modeles", label: "Modèles de documents", permission: "MODELES_DOCUMENTS:LECTURE" },
      { key: "en-tete-institutionnelle", label: "En-tête institutionnelle", permission: "PARAMETRES_DOCUMENTS:LECTURE" },
      { key: "modele-carte-etudiant", label: "Modèle carte d'étudiant", permission: "PARAMETRES_DOCUMENTS:LECTURE" },
    ],
  },
  {
    title: "Étudiants",
    items: [{ key: "numerotation", label: "Numérotation des matricules", permission: "ETUDIANTS:ADMINISTRATION" }],
  },
  {
    title: "Inscriptions",
    items: [
      { key: "regimes", label: "Régimes d'inscription", permission: "INSCRIPTIONS:ADMINISTRATION" },
      { key: "reglages-inscriptions", label: "Capacité & documents obligatoires", permission: "INSCRIPTIONS:ADMINISTRATION" },
      { key: "numerotation-inscriptions", label: "Numérotation des inscriptions", permission: "INSCRIPTIONS:ADMINISTRATION" },
    ],
  },
  {
    title: "Structure pédagogique",
    items: [
      { key: "matieres", label: "Matières", permission: "MATIERES:LECTURE" },
      { key: "unites-enseignement", label: "Unités d'enseignement", permission: "MATIERES:LECTURE" },
      { key: "affectations-matieres", label: "Affectations (coefficients/volumes)", permission: "MATIERES:LECTURE" },
      { key: "validation-pedagogique", label: "Validation pédagogique", permission: "MATIERES:LECTURE" },
      { key: "tableau-bord-pedagogique", label: "Tableau de bord pédagogique", permission: "MATIERES:LECTURE" },
    ],
  },
  {
    title: "Enseignants",
    items: [
      { key: "statuts-enseignants", label: "Statuts", permission: "ENSEIGNANTS:ADMINISTRATION" },
      { key: "types-contrat-enseignants", label: "Types de contrat", permission: "ENSEIGNANTS:ADMINISTRATION" },
    ],
  },
  {
    title: "Paie",
    items: [
      { key: "categories-employes", label: "Catégories d'employés", permission: "PAIE_EMPLOYES:CREATION" },
      { key: "composants-paie", label: "Composants de paie", permission: "PAIE:ADMINISTRATION" },
      { key: "reglages-paie", label: "Réglages", permission: "PAIE:ADMINISTRATION" },
    ],
  },
  {
    title: "Évaluation",
    items: [{ key: "reglages-evaluation", label: "Pondérations & seuils de mention", permission: "EVALUATION:ADMINISTRATION" }],
  },
  {
    title: "Emploi du temps",
    items: [
      { key: "salles", label: "Salles", permission: "SALLES:LECTURE" },
      { key: "groupes-pedagogiques", label: "Groupes pédagogiques", permission: "GROUPES_PEDAGOGIQUES:LECTURE" },
    ],
  },
  {
    title: "Communication",
    items: [{ key: "communication", label: "Passerelles & notifications", permission: "PARAMETRES_COMMUNICATION:LECTURE" }],
  },
  {
    title: "Système",
    items: [
      { key: "sauvegarde", label: "Sauvegarde des paramètres", permission: "PARAMETRES_SAUVEGARDE:LECTURE" },
      { key: "sauvegarde-bdd", label: "Sauvegarde de la base de données", permission: "SAUVEGARDE_BDD:LECTURE" },
      { key: "securite", label: "Sécurité", permission: "PARAMETRES_SECURITE:LECTURE" },
    ],
  },
];

const SCREENS: Record<SettingsSection, () => JSX.Element> = {
  etablissement: EstablishmentScreen,
  campus: CampusScreen,
  signatures: SignatoriesScreen,
  cachet: StampScreen,
  annees: AcademicYearsScreen,
  filieres: FilieresScreen,
  niveaux: LevelsScreen,
  classes: ClassesScreen,
  localisation: LocalizationScreen,
  apparence: ThemeScreen,
  modeles: DocumentTemplatesScreen,
  sauvegarde: BackupScreen,
  numerotation: StudentNumberingScreen,
  regimes: EnrollmentRegimesScreen,
  "reglages-inscriptions": EnrollmentSettingsScreen,
  "numerotation-inscriptions": EnrollmentNumberingScreen,
  matieres: SubjectsScreen,
  "unites-enseignement": TeachingUnitsScreen,
  "affectations-matieres": SubjectOfferingsScreen,
  "validation-pedagogique": PedagogicalValidationScreen,
  "tableau-bord-pedagogique": PedagogicalDashboardScreen,
  "statuts-enseignants": TeacherStatusesScreen,
  "types-contrat-enseignants": TeacherContractTypesScreen,
  "categories-employes": EmployeeCategoriesScreen,
  "composants-paie": PayrollComponentTypesScreen,
  "reglages-paie": PayrollSettingsScreen,
  "themes-impression": PrintThemeScreen,
  "reglages-evaluation": EvaluationSettingsScreen,
  salles: RoomsScreen,
  "groupes-pedagogiques": PedagogicalGroupsScreen,
  communication: CommunicationSettingsScreen,
  "en-tete-institutionnelle": InstitutionalHeaderScreen,
  "modele-carte-etudiant": StudentCardTemplateScreen,
  securite: SecuritySettingsScreen,
  "sauvegarde-bdd": DatabaseBackupScreen,
};

/**
 * Coquille du module Paramètres (Chapitre 3) : sous-navigation par catégories. `initialSection`
 * permet une navigation depuis un autre écran (recherche globale) directement vers une catégorie
 * (ex. Classes, Filières) — appliqué une seule fois au montage, pas de mode contrôlé.
 */
export function SettingsShell({ initialSection }: { initialSection?: SettingsSection } = {}) {
  const [section, setSection] = useState<SettingsSection>(initialSection ?? "etablissement");
  const roleCode = useAuthStore((s) => s.user?.role?.code);
  const permissionCodes = useAuthStore((s) => s.permissionCodes);
  const permissions = Object.fromEntries(
    CATEGORIES.flatMap((c) => c.items).map((item) => [
      item.key,
      hasPermission(roleCode, permissionCodes, item.permission),
    ])
  ) as Record<SettingsSection, boolean>;

  const ActiveScreen = SCREENS[section];

  return (
    <div className="flex gap-6">
      <nav className="flex w-56 flex-col gap-4">
        {CATEGORIES.map((category) => {
          const visibleItems = category.items.filter((item) => permissions[item.key]);
          if (visibleItems.length === 0) return null;
          return (
            <div key={category.title}>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{category.title}</p>
              <div className="flex flex-col gap-1">
                {visibleItems.map((item) => (
                  <Button
                    key={item.key}
                    variant={section === item.key ? "primary" : "ghost"}
                    className="!justify-start"
                    onClick={() => setSection(item.key)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="flex-1">{permissions[section] ? <ActiveScreen /> : null}</div>
    </div>
  );
}
