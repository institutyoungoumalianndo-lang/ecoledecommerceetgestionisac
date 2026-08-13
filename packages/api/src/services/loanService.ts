import { prisma, type Prisma } from "@isac-erp/db";
import type { CreateLoanInput, ListLoansInput, LoanDto } from "@isac-erp/shared";
import { getOrCreateLibrarySettingsRow } from "./librarySettingsService.js";

const loanInclude = {
  bookCopy: { include: { book: true } },
  borrowerStudent: true,
  borrowerTeacher: true,
  borrowerEmployee: { include: { teacher: true } },
} satisfies Prisma.LoanInclude;

type LoanWithRelations = Prisma.LoanGetPayload<{ include: typeof loanInclude }>;

/** Nom de l'emprunteur — un employé lié à un enseignant payé (`Employee.teacherId`) affiche l'identité
 * de l'enseignant, jamais une copie (même principe que `assetService.resolveResponsibleName`). */
export function resolveBorrowerName(loan: LoanWithRelations): string | null {
  if (loan.borrowerStudent) {
    return `${loan.borrowerStudent.firstName} ${loan.borrowerStudent.lastName}`.trim() || null;
  }
  if (loan.borrowerEmployee) {
    const source = loan.borrowerEmployee.teacher ?? loan.borrowerEmployee;
    return `${source.firstName ?? ""} ${source.lastName ?? ""}`.trim() || null;
  }
  if (loan.borrowerTeacher) {
    return `${loan.borrowerTeacher.firstName} ${loan.borrowerTeacher.lastName}`.trim() || null;
  }
  return null;
}

function toLoanDto(loan: LoanWithRelations): LoanDto {
  return {
    id: loan.id,
    bookCopyId: loan.bookCopyId,
    bookCopyInventoryNumber: loan.bookCopy.inventoryNumber,
    bookTitle: loan.bookCopy.book.title,
    borrowerStudentId: loan.borrowerStudentId,
    borrowerTeacherId: loan.borrowerTeacherId,
    borrowerEmployeeId: loan.borrowerEmployeeId,
    borrowerName: resolveBorrowerName(loan),
    loanDate: loan.loanDate,
    dueDate: loan.dueDate,
    returnedAt: loan.returnedAt,
    status: loan.status,
    createdAt: loan.createdAt,
  };
}

export async function listLoans(input: ListLoansInput): Promise<LoanDto[]> {
  const where: Prisma.LoanWhereInput = { status: input.status };
  if (input.overdueOnly) {
    where.status = "EN_COURS";
    where.dueDate = { lt: new Date() };
  }
  const loans = await prisma.loan.findMany({ where, include: loanInclude, orderBy: { loanDate: "desc" } });
  return loans.map(toLoanDto);
}

/**
 * Enregistre un emprunt (MODULE-13 §1.2) — vérifie la disponibilité de l'exemplaire et la limite
 * d'emprunts simultanés de l'emprunteur (réglage configurable) avant de créer l'emprunt et de marquer
 * l'exemplaire "Emprunté".
 */
export async function createLoan(input: CreateLoanInput, actorUserId: string): Promise<LoanDto> {
  const loan = await prisma.$transaction(async (tx) => {
    const copy = await tx.bookCopy.findUniqueOrThrow({ where: { id: input.bookCopyId } });
    if (copy.status !== "DISPONIBLE") {
      throw new Error("Cet exemplaire n'est pas disponible pour un nouvel emprunt.");
    }

    const settings = await getOrCreateLibrarySettingsRow();
    const activeLoanCount = await tx.loan.count({
      where: {
        status: "EN_COURS",
        borrowerStudentId: input.borrowerStudentId ?? undefined,
        borrowerTeacherId: input.borrowerTeacherId ?? undefined,
        borrowerEmployeeId: input.borrowerEmployeeId ?? undefined,
      },
    });
    if (activeLoanCount >= settings.maxSimultaneousLoans) {
      throw new Error(
        `Limite d'emprunts simultanés atteinte (${settings.maxSimultaneousLoans} maximum) — l'emprunteur doit rendre un exemplaire avant d'en emprunter un autre.`
      );
    }

    const loanDate = new Date();
    const dueDate = new Date(loanDate.getTime() + settings.defaultLoanDurationDays * 24 * 60 * 60 * 1000);

    await tx.bookCopy.update({ where: { id: input.bookCopyId }, data: { status: "EMPRUNTE" } });

    return tx.loan.create({
      data: {
        bookCopyId: input.bookCopyId,
        borrowerStudentId: input.borrowerStudentId ?? null,
        borrowerTeacherId: input.borrowerTeacherId ?? null,
        borrowerEmployeeId: input.borrowerEmployeeId ?? null,
        loanDate,
        dueDate,
        createdBy: actorUserId,
      },
      include: loanInclude,
    });
  });

  return toLoanDto(loan);
}

export async function returnLoan(id: string): Promise<LoanDto> {
  const loan = await prisma.$transaction(async (tx) => {
    const existing = await tx.loan.findUniqueOrThrow({ where: { id } });
    if (existing.status !== "EN_COURS") {
      throw new Error("Cet emprunt n'est plus en cours.");
    }
    await tx.bookCopy.update({ where: { id: existing.bookCopyId }, data: { status: "DISPONIBLE" } });
    return tx.loan.update({
      where: { id },
      data: { status: "RENDU", returnedAt: new Date() },
      include: loanInclude,
    });
  });
  return toLoanDto(loan);
}
