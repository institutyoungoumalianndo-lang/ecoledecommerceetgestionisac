import { APP_NAME, SUPER_ADMIN_ROLE_CODE } from "@isac-erp/shared";
import { Button, Select } from "@isac-erp/ui";
import {
  Banknote,
  Briefcase,
  BookOpen,
  Calculator,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  ClipboardList,
  Coins,
  CreditCard,
  FileText,
  GraduationCap,
  BookOpenCheck,
  Globe,
  History,
  KeyRound,
  Boxes,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  LogOut,
  MessageSquare,
  Presentation,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useAuthStore, useHasPermission } from "../../store/authStore";
import { AuditLogScreen } from "../audit/AuditLogScreen";
import { EnrollmentsScreen } from "../enrollments/EnrollmentsScreen";
import { AccountingScreen } from "../accounting/AccountingScreen";
import { FeesScreen } from "../fees/FeesScreen";
import { PaymentsScreen } from "../payments/PaymentsScreen";
import { RolesScreen } from "../roles/RolesScreen";
import { StudentsScreen } from "../students/StudentsScreen";
import { TeachersModuleScreen } from "../teachers/TeachersModuleScreen";
import { EmploiDuTempsModuleScreen } from "../emploiDuTemps/EmploiDuTempsModuleScreen";
import { PayrollModuleScreen } from "../payroll/PayrollModuleScreen";
import { EvaluationModuleScreen } from "../evaluation/EvaluationModuleScreen";
import { CommunicationModuleScreen } from "../communication/CommunicationModuleScreen";
import { NotificationBell } from "../communication/NotificationBell";
import { DocumentsModuleScreen } from "../documents/DocumentsModuleScreen";
import { DecisionalReportsModuleScreen } from "../decisionalReports/DecisionalReportsModuleScreen";
import { UsersScreen } from "../users/UsersScreen";
import { ActivationKeysScreen } from "../users/ActivationKeysScreen";
import { HomeDashboardScreen } from "../dashboard/HomeDashboardScreen";
import { SettingsShell, type SettingsSection } from "../settings/SettingsShell";
import { TwoFactorSettingsDialog } from "../auth/TwoFactorSettingsDialog";
import { InventoryModuleScreen } from "../inventory/InventoryModuleScreen";
import { LibraryModuleScreen } from "../library/LibraryModuleScreen";
import { PortalWebScreen } from "../portal/PortalWebScreen";
import { GlobalSearchBox } from "./GlobalSearchBox";

type Section =
  | "tableau-de-bord"
  | "utilisateurs"
  | "roles"
  | "cles-activation"
  | "audit"
  | "etudiants"
  | "inscriptions"
  | "frais"
  | "paiements"
  | "comptabilite"
  | "enseignants"
  | "emploi-du-temps"
  | "evaluation"
  | "paie"
  | "communication"
  | "documents"
  | "pilotage"
  | "inventaire"
  | "bibliotheque"
  | "portail-web"
  | "parametres";

interface NavItem {
  key: Section;
  label: string;
  icon: LucideIcon;
  visible: boolean;
}

interface NavCategory {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

/**
 * Coquille applicative — refonte UI/UX Phase 2 (2026-07-30) : barre du haut
 * enrichie (établissement, année académique, campus, utilisateur, horloge) et
 * menu latéral catégorisé (icônes lucide-react, recherche de module,
 * repliable), sur le même principe que `SettingsShell`. Périmètre fonctionnel
 * inchangé — mêmes 15 sections, mêmes permissions, mêmes écrans.
 */
export function AppShell() {
  const [section, setSection] = useState<Section>("tableau-de-bord");
  const [studentIdToOpen, setStudentIdToOpen] = useState<string | null>(null);
  const [teacherIdToOpen, setTeacherIdToOpen] = useState<string | null>(null);
  const [teacherIdForNewEmployee, setTeacherIdForNewEmployee] = useState<string | null>(null);
  const [settingsInitialSection, setSettingsInitialSection] = useState<SettingsSection | undefined>(undefined);
  const [collapsed, setCollapsed] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  // Menu en accordéon (2026-08-09, retour du porteur du projet — "Exemple 1, Accordéon" retenu parmi
  // 3 maquettes) : une seule catégorie dépliée à la fois, synchronisée sur la section active pour que
  // l'élément courant reste toujours visible même après une navigation externe (recherche globale,
  // notification...). Ignoré pendant une recherche de module (toutes les catégories correspondantes
  // restent dépliées, voir plus bas) et pendant le repli complet du menu (mode icônes seules).
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const canSeeUsers = useHasPermission("UTILISATEURS:LECTURE");
  const canSeeRoles = useHasPermission("ROLES:LECTURE");
  const canSeeAudit = useHasPermission("AUDIT:LECTURE");
  const canSeeStudents = useHasPermission("ETUDIANTS:LECTURE");
  const canSeeEnrollments = useHasPermission("INSCRIPTIONS:LECTURE");
  const canSeeFees = useHasPermission("FRAIS:LECTURE");
  const canSeePayments = useHasPermission("PAIEMENTS:LECTURE");
  const canSeeAccounting = useHasPermission("RAPPORTS_FINANCIERS:LECTURE");
  const canSeeTeachers = useHasPermission("ENSEIGNANTS:LECTURE");
  const canSeeEmploiDuTemps = useHasPermission("EMPLOI_DU_TEMPS:LECTURE");
  const canSeeEvaluation = useHasPermission("NOTES:LECTURE");
  const canSeePayroll = useHasPermission("PAIE:LECTURE");
  const canSeeCommunication = useHasPermission("COMMUNICATION:LECTURE");
  const canSeeDocuments = useHasPermission("DOCUMENTS:LECTURE");
  const canSeeDecisionalReports = useHasPermission("RAPPORTS_DECISIONNELS:LECTURE");
  const canSeeAlerts = useHasPermission("ALERTES:LECTURE");
  const canSeeInventory = useHasPermission("INVENTAIRE:LECTURE");
  const canSeeLibrary = useHasPermission("BIBLIOTHEQUE:LECTURE");
  const canSeePortalWeb = useHasPermission("PORTAIL_WEB:LECTURE");
  const isSuperAdmin = useAuthStore((s) => s.user?.role?.code === SUPER_ADMIN_ROLE_CODE);
  const canSeeSettings = useHasPermission("ETABLISSEMENT:LECTURE");
  const canSeeAcademicYears = useHasPermission("ANNEES:LECTURE");
  const canSwitchAcademicYear = useHasPermission("ANNEES:ADMINISTRATION");

  const utils = trpc.useUtils();
  const establishment = trpc.establishment.get.useQuery();
  const campus = trpc.campus.get.useQuery();
  const academicYears = trpc.academicYears.list.useQuery(undefined, { enabled: canSeeAcademicYears });
  const activeAcademicYear = academicYears.data?.find((y) => y.isActive);
  // Sélecteur d'année dans la barre du haut (2026-08-09, retour du porteur du projet : "transformer
  // l'année scolaire qui s'affiche... en combo box... dès que je sélectionne une année passée ou active
  // le tableau de bord et les autres fenêtres se mettent automatiquement à jour"). Choisir une année ici
  // l'active réellement (comme depuis Réglages → Années universitaires) puis rafraîchit tout le cache —
  // c'est donc bien la même bascule d'année pour toute l'application, jamais un simple filtre d'affichage
  // propre au tableau de bord.
  const switchAcademicYear = trpc.academicYears.activate.useMutation({ onSuccess: () => void utils.invalidate() });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function openStudentFromElsewhere(studentId: string) {
    setStudentIdToOpen(studentId);
    setSection("etudiants");
  }

  function openTeacherFromElsewhere(teacherId: string) {
    setTeacherIdToOpen(teacherId);
    setSection("enseignants");
  }

  /** Pont Enseignant → Paie (extension du 2026-07-30) : depuis la fiche enseignant, ouvre directement
   * la création d'un Employé lié, sans que l'admin ait à chercher le menu déroulant caché. */
  function openPayrollEmployeeCreationForTeacher(teacherId: string) {
    setTeacherIdForNewEmployee(teacherId);
    setSection("paie");
  }

  function openSettingsSectionFromElsewhere(settingsSection: SettingsSection) {
    setSettingsInitialSection(settingsSection);
    setSection("parametres");
  }

  function navigateFromNotification(linkType: string) {
    if (linkType === "payment") setSection("paiements");
    else if (linkType === "document") setSection("documents");
    else if (linkType === "settings-backup") openSettingsSectionFromElsewhere("sauvegarde");
  }

  const logout = trpc.auth.logout.useMutation({ onSettled: () => clearSession() });

  const categories: NavCategory[] = [
    {
      title: "Administration",
      icon: UserCog,
      items: [
        { key: "utilisateurs", label: "Utilisateurs", icon: Users, visible: canSeeUsers },
        { key: "roles", label: "Rôles & permissions", icon: ShieldCheck, visible: canSeeRoles },
        { key: "cles-activation", label: "Clés d'activation", icon: KeyRound, visible: isSuperAdmin },
        { key: "audit", label: "Journal d'audit", icon: History, visible: canSeeAudit },
      ],
    },
    {
      title: "Étudiants",
      icon: GraduationCap,
      items: [
        { key: "etudiants", label: "Étudiants", icon: GraduationCap, visible: canSeeStudents },
        { key: "inscriptions", label: "Inscriptions", icon: ClipboardList, visible: canSeeEnrollments },
      ],
    },
    {
      title: "Scolarité",
      icon: BookOpen,
      items: [
        { key: "frais", label: "Frais", icon: Coins, visible: canSeeFees },
        { key: "evaluation", label: "Évaluation", icon: ClipboardCheck, visible: canSeeEvaluation },
      ],
    },
    {
      title: "Finances",
      icon: Landmark,
      items: [
        { key: "paiements", label: "Paiements", icon: CreditCard, visible: canSeePayments },
        { key: "comptabilite", label: "Comptabilité", icon: Calculator, visible: canSeeAccounting },
      ],
    },
    {
      title: "Personnel",
      icon: Briefcase,
      items: [
        { key: "enseignants", label: "Enseignants", icon: Presentation, visible: canSeeTeachers },
        { key: "emploi-du-temps", label: "Emploi du temps", icon: CalendarClock, visible: canSeeEmploiDuTemps },
        { key: "paie", label: "Paie", icon: Banknote, visible: canSeePayroll },
      ],
    },
    {
      title: "Communication",
      icon: MessageSquare,
      items: [{ key: "communication", label: "Communication", icon: MessageSquare, visible: canSeeCommunication }],
    },
    {
      title: "Documents",
      icon: FileText,
      items: [{ key: "documents", label: "Documents officiels", icon: FileText, visible: canSeeDocuments }],
    },
    {
      title: "Pilotage",
      icon: TrendingUp,
      items: [{ key: "pilotage", label: "Rapports décisionnels", icon: TrendingUp, visible: canSeeDecisionalReports || canSeeAlerts }],
    },
    {
      title: "Inventaire",
      icon: Boxes,
      items: [{ key: "inventaire", label: "Inventaire", icon: Boxes, visible: canSeeInventory }],
    },
    {
      title: "Bibliothèque",
      icon: BookOpenCheck,
      items: [{ key: "bibliotheque", label: "Bibliothèque", icon: BookOpenCheck, visible: canSeeLibrary }],
    },
    {
      title: "Portail web",
      icon: Globe,
      items: [{ key: "portail-web", label: "Portail web", icon: Globe, visible: canSeePortalWeb }],
    },
    {
      title: "Paramètres",
      icon: Settings,
      items: [{ key: "parametres", label: "Paramètres", icon: Settings, visible: canSeeSettings }],
    },
  ];

  useEffect(() => {
    const owner = categories.find((c) => c.items.some((i) => i.key === section))?.title;
    if (owner) setExpandedCategory(owner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  function toggleCategory(title: string) {
    setExpandedCategory((prev) => (prev === title ? null : title));
  }

  const normalizedQuery = navQuery.trim().toLowerCase();
  const isSearching = normalizedQuery !== "";
  const filteredCategories = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          items: category.items.filter(
            (item) => item.visible && (normalizedQuery === "" || item.label.toLowerCase().includes(normalizedQuery))
          ),
        }))
        .filter((category) => category.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalizedQuery, section]
  );

  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeLabel = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="flex min-h-screen">
      <aside
        className={`flex flex-col gap-3 border-r border-border bg-menu p-3 transition-all duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-1">
          {!collapsed && <h2 className="truncate text-sm font-semibold text-menu-foreground">{APP_NAME}</h2>}
          <button
            type="button"
            aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto shrink-0 rounded-md p-1.5 text-menu-foreground/80 transition-colors hover:bg-white/10 hover:text-menu-foreground"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>

        {/* !text-menu-foreground (2026-08-02, retour du porteur du projet) : le variant "ghost" du
            Button pose déjà `text-window-foreground` — cn() n'utilise pas tailwind-merge, donc les
            deux classes de couleur concurrentes ne se départagent pas de façon fiable (l'une des deux
            gagne selon l'ordre de génération de la feuille de style, pas l'ordre dans le JSX). Le menu
            latéral reste toujours sombre (--menu) quelle que soit la couleur de fenêtre choisie par
            l'établissement ; `!` force la couleur du menu à gagner à coup sûr. */}
        <Button
          variant={section === "tableau-de-bord" ? "primary" : "ghost"}
          icon={<LayoutDashboard size={16} />}
          title={collapsed ? "Tableau de bord" : undefined}
          className={`!text-menu-foreground transition-transform hover:translate-x-0.5 hover:!bg-white/10 ${
            collapsed ? "!justify-center !px-0" : "!justify-start"
          }`}
          onClick={() => setSection("tableau-de-bord")}
        >
          {!collapsed && "Tableau de bord"}
        </Button>

        {!collapsed && (
          <div className="relative px-1">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-menu-foreground/50" />
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Rechercher un module…"
              className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 text-xs text-menu-foreground placeholder:text-menu-foreground/50 outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            />
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {filteredCategories.map((category) => {
            const isOpen = isSearching || expandedCategory === category.title;
            return (
              <div key={category.title}>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.title)}
                    className="mb-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-menu-foreground/60 transition-colors hover:bg-white/5 hover:text-menu-foreground"
                  >
                    <category.icon size={12} />
                    <span className="flex-1 text-left">{category.title}</span>
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}
                {(collapsed || isOpen) && (
                  <div className="flex flex-col gap-1 pb-2">
                    {category.items.map((item) => (
                      <Button
                        key={item.key}
                        variant={section === item.key ? "primary" : "ghost"}
                        icon={<item.icon size={16} />}
                        title={collapsed ? item.label : undefined}
                        className={`!text-menu-foreground transition-transform hover:translate-x-0.5 hover:!bg-white/10 ${
                          collapsed ? "!justify-center !px-0" : "!justify-start"
                        }`}
                        onClick={() => setSection(item.key)}
                      >
                        {!collapsed && item.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredCategories.length === 0 && !collapsed && (
            <p className="px-2 text-xs text-menu-foreground/60">Aucun module ne correspond à « {navQuery} ».</p>
          )}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header
          className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-button to-button/75 text-window-foreground px-6 py-2.5 shadow-[0_10px_26px_-10px_hsl(var(--button)/0.55),inset_0_1px_0_hsl(var(--button-foreground)/0.15)]"
          style={{ "--window-foreground": "0 0% 100%" } as CSSProperties}
        >
          <div className="flex items-center gap-3">
            {establishment.data?.logoPrimaryPath && (
              <img
                src={resolveUploadUrl(establishment.data.logoPrimaryPath) ?? undefined}
                alt=""
                className="h-9 w-9 rounded-md object-contain"
              />
            )}
            <div className="leading-tight">
              <p className="text-sm font-semibold text-window-foreground">{establishment.data?.officialName || APP_NAME}</p>
              <p className="text-xs text-window-foreground/70">{campus.data?.name}</p>
            </div>
          </div>

          <GlobalSearchBox
            handlers={{
              onOpenStudent: openStudentFromElsewhere,
              onOpenTeacher: openTeacherFromElsewhere,
              onOpenClass: () => openSettingsSectionFromElsewhere("classes"),
              onOpenFiliere: () => openSettingsSectionFromElsewhere("filieres"),
              onOpenDocuments: () => setSection("documents"),
              onOpenPayments: () => setSection("paiements"),
            }}
          />

          <div className="flex items-center gap-4 text-xs text-window-foreground/70">
            {canSwitchAcademicYear && academicYears.data && academicYears.data.length > 0 ? (
              <Select
                value={activeAcademicYear?.id ?? ""}
                disabled={switchAcademicYear.isPending}
                className="h-10 w-auto rounded-full border-none bg-window-foreground/10 px-4 py-0 text-sm font-semibold text-window-foreground"
                onChange={(e) => {
                  if (e.target.value) switchAcademicYear.mutate({ id: e.target.value });
                }}
              >
                {academicYears.data.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                    {y.isClosed ? " (clôturée)" : ""}
                  </option>
                ))}
              </Select>
            ) : (
              activeAcademicYear && (
                <span className="rounded-full bg-window-foreground/10 px-2.5 py-1 font-medium text-window-foreground">
                  Année {activeAcademicYear.label}
                </span>
              )
            )}
            <span className="hidden capitalize sm:inline">{dateLabel}</span>
            <span className="font-mono tabular-nums">{timeLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-window-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              {user?.role && <p className="text-xs text-window-foreground/70">{user.role.label}</p>}
            </div>
            <NotificationBell onNavigate={navigateFromNotification} />
            <Button
              variant="outline"
              icon={<KeyRound size={16} />}
              title="Double authentification"
              onClick={() => setTwoFactorDialogOpen(true)}
            >
              2FA
            </Button>
            <Button
              variant="outline"
              icon={<LogOut size={16} />}
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              Se déconnecter
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {section === "tableau-de-bord" && <HomeDashboardScreen />}
          {section === "utilisateurs" && canSeeUsers && <UsersScreen />}
          {section === "roles" && canSeeRoles && <RolesScreen />}
          {section === "cles-activation" && isSuperAdmin && <ActivationKeysScreen />}
          {section === "audit" && canSeeAudit && <AuditLogScreen />}
          {section === "etudiants" && canSeeStudents && (
            <StudentsScreen
              openStudentId={studentIdToOpen}
              onOpenStudentIdConsumed={() => setStudentIdToOpen(null)}
            />
          )}
          {section === "inscriptions" && canSeeEnrollments && (
            <EnrollmentsScreen onOpenStudent={openStudentFromElsewhere} />
          )}
          {section === "frais" && canSeeFees && <FeesScreen />}
          {section === "paiements" && canSeePayments && <PaymentsScreen />}
          {section === "comptabilite" && canSeeAccounting && <AccountingScreen />}
          {section === "enseignants" && canSeeTeachers && (
            <TeachersModuleScreen
              openTeacherId={teacherIdToOpen}
              onOpenTeacherIdConsumed={() => setTeacherIdToOpen(null)}
              onCreatePayrollProfile={openPayrollEmployeeCreationForTeacher}
            />
          )}
          {section === "emploi-du-temps" && canSeeEmploiDuTemps && <EmploiDuTempsModuleScreen />}
          {section === "evaluation" && canSeeEvaluation && <EvaluationModuleScreen />}
          {section === "paie" && canSeePayroll && (
            <PayrollModuleScreen
              openEmployeeCreationForTeacherId={teacherIdForNewEmployee}
              onOpenEmployeeCreationForTeacherIdConsumed={() => setTeacherIdForNewEmployee(null)}
            />
          )}
          {section === "communication" && canSeeCommunication && <CommunicationModuleScreen />}
          {section === "documents" && canSeeDocuments && <DocumentsModuleScreen />}
          {section === "pilotage" && (canSeeDecisionalReports || canSeeAlerts) && <DecisionalReportsModuleScreen />}
          {section === "inventaire" && canSeeInventory && <InventoryModuleScreen />}
          {section === "bibliotheque" && canSeeLibrary && <LibraryModuleScreen />}
          {section === "portail-web" && canSeePortalWeb && <PortalWebScreen />}
          {section === "parametres" && canSeeSettings && (
            <SettingsShell key={settingsInitialSection ?? "default"} initialSection={settingsInitialSection} />
          )}
        </main>
      </div>

      {twoFactorDialogOpen && <TwoFactorSettingsDialog onClose={() => setTwoFactorDialogOpen(false)} />}
    </div>
  );
}
