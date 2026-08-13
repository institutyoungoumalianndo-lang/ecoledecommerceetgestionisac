import { prisma } from "@isac-erp/db";
import type { CommunicationContactDto, CommunicationContactPage, ListCommunicationContactsInput } from "@isac-erp/shared";

/**
 * Carnet d'adresses transverse (voir MODULE-12 §1.3) — jamais une table de contacts : lecture à la
 * demande sur Student/Guardian/Teacher/Employee, déjà porteurs des champs nécessaires. Aucune copie
 * synchronisée, donc aucune désynchronisation possible ("aucune ressaisie ne devra être nécessaire").
 */

async function studentContacts(campus: string | null): Promise<CommunicationContactDto[]> {
  const students = await prisma.student.findMany({
    include: {
      enrollments: {
        where: { cancelledAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { class: true, filiere: true },
      },
    },
  });
  return students.map((s) => {
    const enrollment = s.enrollments[0];
    return {
      id: `ETUDIANT:${s.id}`,
      type: "ETUDIANT" as const,
      lastName: s.lastName,
      firstName: s.firstName,
      phonePrimary: s.phonePrimary,
      phoneSecondary: s.phoneSecondary,
      whatsapp: null,
      email: s.email,
      campus,
      className: enrollment?.class.name ?? null,
      filiereName: enrollment?.filiere.name ?? null,
      fonction: null,
      statut: s.archivedAt ? "Archivé" : "Actif",
    };
  });
}

async function guardianContacts(campus: string | null): Promise<CommunicationContactDto[]> {
  const guardians = await prisma.guardian.findMany();
  return guardians.map((g) => ({
    id: `PARENT:${g.id}`,
    type: "PARENT" as const,
    lastName: g.lastName,
    firstName: g.firstName,
    phonePrimary: g.phonePrimary,
    phoneSecondary: g.phoneSecondary,
    whatsapp: g.whatsapp,
    email: g.email,
    campus,
    className: null,
    filiereName: null,
    fonction: g.profession,
    statut: "Actif",
  }));
}

async function teacherContacts(campus: string | null): Promise<CommunicationContactDto[]> {
  const teachers = await prisma.teacher.findMany();
  return teachers.map((t) => ({
    id: `ENSEIGNANT:${t.id}`,
    type: "ENSEIGNANT" as const,
    lastName: t.lastName,
    firstName: t.firstName,
    phonePrimary: t.phonePrimary,
    phoneSecondary: t.phoneSecondary,
    whatsapp: t.whatsapp,
    email: t.email,
    campus,
    className: null,
    filiereName: null,
    fonction: t.function,
    statut: t.archivedAt ? "Archivé" : "Actif",
  }));
}

async function employeeContacts(campus: string | null): Promise<CommunicationContactDto[]> {
  const employees = await prisma.employee.findMany({ include: { category: true } });
  return employees
    .filter((e) => e.lastName && e.firstName)
    .map((e) => ({
      id: `PERSONNEL:${e.id}`,
      type: "PERSONNEL" as const,
      lastName: e.lastName as string,
      firstName: e.firstName as string,
      phonePrimary: e.phonePrimary,
      phoneSecondary: e.phoneSecondary,
      whatsapp: e.whatsapp,
      email: e.email,
      campus,
      className: null,
      filiereName: null,
      fonction: e.category.label,
      statut: e.archivedAt ? "Archivé" : "Actif",
    }));
}

async function allContacts(): Promise<CommunicationContactDto[]> {
  const campusSettings = await prisma.campusSettings.findFirst();
  const campus = campusSettings?.name ?? null;
  const [students, guardians, teachers, employees] = await Promise.all([
    studentContacts(campus),
    guardianContacts(campus),
    teacherContacts(campus),
    employeeContacts(campus),
  ]);
  return [...students, ...guardians, ...teachers, ...employees];
}

export async function listCommunicationContacts(
  input: ListCommunicationContactsInput
): Promise<CommunicationContactPage> {
  let contacts = await allContacts();

  if (input.type) contacts = contacts.filter((c) => c.type === input.type);

  if (input.search) {
    const term = input.search.trim().toLowerCase();
    contacts = contacts.filter(
      (c) =>
        `${c.lastName} ${c.firstName}`.toLowerCase().includes(term) ||
        (c.phonePrimary ?? "").includes(term) ||
        (c.phoneSecondary ?? "").includes(term) ||
        (c.email ?? "").toLowerCase().includes(term)
    );
  }

  const total = contacts.length;
  const start = (input.page - 1) * input.pageSize;
  const rows = contacts
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))
    .slice(start, start + input.pageSize);

  return { rows, total };
}

/** Résout des identifiants composites ("TYPE:id") en contacts complets (voir MODULE-12 §1.4/§1.5). */
export async function resolveCommunicationContacts(recipientIds: string[]): Promise<CommunicationContactDto[]> {
  const contacts = await allContacts();
  const byId = new Map(contacts.map((c) => [c.id, c]));
  return recipientIds.map((id) => byId.get(id)).filter((c): c is CommunicationContactDto => Boolean(c));
}

/** Résout une audience de campagne (voir MODULE-12 §1.6) — toujours à la demande, jamais figée. */
export async function resolveCampaignAudience(
  audienceType:
    | "INDIVIDUEL"
    | "CLASSE"
    | "CLASSES"
    | "FILIERE"
    | "FILIERES"
    | "CAMPUS"
    | "TOUS_ETUDIANTS"
    | "TOUS_ENSEIGNANTS"
    | "TOUS_PARENTS"
    | "TOUT_PERSONNEL",
  filter: { classIds?: string[]; filiereIds?: string[]; recipientIds?: string[] } | null
): Promise<CommunicationContactDto[]> {
  const contacts = await allContacts();

  switch (audienceType) {
    case "INDIVIDUEL": {
      const ids = new Set(filter?.recipientIds ?? []);
      return contacts.filter((c) => ids.has(c.id));
    }
    case "CLASSE":
    case "CLASSES": {
      const classNames = new Set(
        filter?.classIds
          ? (await prisma.class.findMany({ where: { id: { in: filter.classIds } } })).map((c) => c.name)
          : []
      );
      return contacts.filter((c) => c.type === "ETUDIANT" && c.className && classNames.has(c.className));
    }
    case "FILIERE":
    case "FILIERES": {
      const filiereNames = new Set(
        filter?.filiereIds
          ? (await prisma.filiere.findMany({ where: { id: { in: filter.filiereIds } } })).map((f) => f.name)
          : []
      );
      return contacts.filter((c) => c.type === "ETUDIANT" && c.filiereName && filiereNames.has(c.filiereName));
    }
    case "CAMPUS":
      // Installation mono-campus (ADR-005) : équivalent à "tous" tant qu'une seconde installation n'existe pas.
      return contacts;
    case "TOUS_ETUDIANTS":
      return contacts.filter((c) => c.type === "ETUDIANT");
    case "TOUS_ENSEIGNANTS":
      return contacts.filter((c) => c.type === "ENSEIGNANT");
    case "TOUS_PARENTS":
      return contacts.filter((c) => c.type === "PARENT");
    case "TOUT_PERSONNEL":
      return contacts.filter((c) => c.type === "PERSONNEL");
    default:
      return [];
  }
}
