import { prisma } from "@isac-erp/db";
import type { GlobalSearchResult, GlobalSearchResultItem } from "@isac-erp/shared";

/** Visibilité par catégorie, résolue par le routeur à partir des permissions déjà vérifiées côté
 * serveur (mêmes codes que les écrans de chaque module) — voir `routers/globalSearch.ts`. */
export interface GlobalSearchVisibility {
  students: boolean;
  teachers: boolean;
  classes: boolean;
  filieres: boolean;
  documents: boolean;
  payments: boolean;
}

const RESULT_LIMIT = 6;

function humanizeDocumentType(type: string): string {
  return type.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

/** Recherche globale (refonte UI/UX, phase finale, 2026-07-30) — composite en lecture seule sur
 * plusieurs modules, comme `homeDashboardService.getHomeDashboard`. Aucune écriture, aucune règle
 * métier : chaque catégorie n'est qu'une recherche `contains` (insensible à la casse). */
export async function globalSearch(query: string, visible: GlobalSearchVisibility): Promise<GlobalSearchResult> {
  const term = query.trim();
  const contains = { contains: term, mode: "insensitive" as const };

  const [students, teachers, classes, filieres, documents, payments] = await Promise.all([
    visible.students
      ? prisma.student.findMany({
          where: { archivedAt: null, OR: [{ matricule: contains }, { lastName: contains }, { firstName: contains }] },
          take: RESULT_LIMIT,
          orderBy: { lastName: "asc" },
        })
      : Promise.resolve(null),
    visible.teachers
      ? prisma.teacher.findMany({
          where: { archivedAt: null, OR: [{ matricule: contains }, { lastName: contains }, { firstName: contains }] },
          take: RESULT_LIMIT,
          orderBy: { lastName: "asc" },
        })
      : Promise.resolve(null),
    visible.classes
      ? prisma.class.findMany({
          where: { isActive: true, OR: [{ code: contains }, { name: contains }] },
          take: RESULT_LIMIT,
          orderBy: { name: "asc" },
        })
      : Promise.resolve(null),
    visible.filieres
      ? prisma.filiere.findMany({
          where: { isActive: true, OR: [{ code: contains }, { name: contains }] },
          take: RESULT_LIMIT,
          orderBy: { name: "asc" },
        })
      : Promise.resolve(null),
    visible.documents
      ? prisma.generatedDocument.findMany({
          where: { documentNumber: contains },
          take: RESULT_LIMIT,
          orderBy: { generatedAt: "desc" },
        })
      : Promise.resolve(null),
    visible.payments
      ? prisma.payment.findMany({
          where: { status: "VALIDE", receiptNumber: contains },
          include: { student: { select: { lastName: true, firstName: true } } },
          take: RESULT_LIMIT,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
  ]);

  const toResult = <T>(rows: T[] | null, map: (row: T) => GlobalSearchResultItem): GlobalSearchResultItem[] | null =>
    rows ? rows.map(map) : null;

  return {
    students: toResult(students, (s) => ({ id: s.id, label: `${s.lastName} ${s.firstName}`, sublabel: s.matricule })),
    teachers: toResult(teachers, (t) => ({ id: t.id, label: `${t.lastName} ${t.firstName}`, sublabel: t.matricule })),
    classes: toResult(classes, (c) => ({ id: c.id, label: c.name, sublabel: c.code })),
    filieres: toResult(filieres, (f) => ({ id: f.id, label: f.name, sublabel: f.code })),
    documents: toResult(documents, (d) => ({
      id: d.id,
      label: d.documentNumber,
      sublabel: humanizeDocumentType(d.documentType),
    })),
    payments: toResult(payments, (p) => ({
      id: p.id,
      label: p.receiptNumber,
      sublabel: `${p.student.lastName} ${p.student.firstName}`,
    })),
  };
}
