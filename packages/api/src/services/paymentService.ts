import { randomUUID } from "node:crypto";
import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CancelPaymentInput,
  CreatePaymentInput,
  ListPaymentsInput,
  ListPaymentsResult,
  PaymentContext,
  PaymentDashboard,
  PaymentDto,
} from "@isac-erp/shared";
import { generateReceiptNumber } from "./matriculeService.js";
import { getStudentFeeSummary, syncEnrollmentPaymentStatus, getTotalOutstandingForActiveYear } from "./feeSummaryService.js";
import { recordPaymentEntry, recordPaymentCancellationEntry } from "./journalEntryService.js";
import { notifyPayment } from "./paymentNotificationService.js";
import { createInternalNotification } from "./internalNotificationService.js";

const PAYMENT_INCLUDE = {
  student: true,
  enrollment: { include: { filiere: true, level: true, class: true } },
  academicYear: true,
  cashRegisterSession: { include: { cashRegister: true } },
  paymentMethod: true,
  recordedByUser: true,
  cancelledByUser: true,
  allocations: { include: { feeType: true, feeInstallment: true } },
} satisfies Prisma.PaymentInclude;

type PaymentWithRelations = Prisma.PaymentGetPayload<{ include: typeof PAYMENT_INCLUDE }>;

function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

function toPaymentDto(row: PaymentWithRelations): PaymentDto {
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    studentId: row.studentId,
    studentMatricule: row.student.matricule,
    studentName: fullName(row.student),
    enrollmentId: row.enrollmentId,
    academicYearId: row.academicYearId,
    academicYearLabel: row.academicYear.label,
    filiereName: row.enrollment.filiere.name,
    levelLabel: row.enrollment.level.label,
    className: row.enrollment.class.name,
    cashRegisterSessionId: row.cashRegisterSessionId,
    cashRegisterName: row.cashRegisterSession.cashRegister.name,
    paymentMethodId: row.paymentMethodId,
    paymentMethodLabel: row.paymentMethod.label,
    amount: Number(row.amount),
    recordedBy: row.recordedBy,
    recordedByName: fullName(row.recordedByUser),
    status: row.status,
    cancelledAt: row.cancelledAt,
    cancelledReason: row.cancelledReason,
    cancelledByName: row.cancelledByUser ? fullName(row.cancelledByUser) : null,
    verificationCode: row.verificationCode,
    externalReference: row.externalReference,
    createdAt: row.createdAt,
    allocations: row.allocations.map((a) => ({
      id: a.id,
      feeTypeId: a.feeTypeId,
      feeTypeName: a.feeType.name,
      feeInstallmentId: a.feeInstallmentId,
      feeInstallmentLabel: a.feeInstallment?.label ?? null,
      amount: Number(a.amount),
    })),
  };
}

/** Contexte d'encaissement (MODULE-04.3 §1.2/§4) — fiche + coût de scolarité pour l'écran d'encaissement. */
export async function getPaymentContext(studentId: string): Promise<PaymentContext> {
  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
  const activeYear = await prisma.academicYear.findFirstOrThrow({ where: { isActive: true } });
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { studentId_academicYearId: { studentId, academicYearId: activeYear.id } },
    include: { filiere: true, level: true, class: true },
  });
  if (!enrollment || enrollment.cancelledAt) {
    throw new Error("Cet étudiant n'a pas d'inscription active pour l'année en cours.");
  }

  const feeSummary = await getStudentFeeSummary({ studentId, academicYearId: activeYear.id });

  return {
    studentId: student.id,
    studentMatricule: student.matricule,
    studentName: fullName(student),
    studentPhotoPath: student.photoPath,
    studentPhonePrimary: student.phonePrimary,
    enrollmentId: enrollment.id,
    academicYearId: activeYear.id,
    academicYearLabel: activeYear.label,
    filiereName: enrollment.filiere.name,
    levelLabel: enrollment.level.label,
    className: enrollment.class.name,
    feeSummary,
  };
}

/**
 * Encaissement (MODULE-04.3 §1.4/§3) : la répartition (`allocations`) porte
 * les cas total/partiel/échéance(s)/frais spécifique — toujours "un paiement,
 * une ou plusieurs lignes". Bloqué si la session n'est pas ouverte par
 * l'utilisateur qui encaisse (règle 1).
 */
export async function createPayment(input: CreatePaymentInput, userId: string): Promise<PaymentDto> {
  const session = await prisma.cashRegisterSession.findUniqueOrThrow({ where: { id: input.cashRegisterSessionId } });
  if (session.status !== "OUVERTE") {
    throw new Error("La session de caisse n'est pas ouverte.");
  }
  if (session.openedBy !== userId) {
    throw new Error("Vous ne pouvez encaisser que sur votre propre session de caisse ouverte.");
  }

  const activeYear = await prisma.academicYear.findFirstOrThrow({ where: { isActive: true } });
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { studentId_academicYearId: { studentId: input.studentId, academicYearId: activeYear.id } },
  });
  if (!enrollment || enrollment.cancelledAt) {
    throw new Error("Cet étudiant n'a pas d'inscription active pour l'année en cours.");
  }

  const installmentIds = input.allocations.map((a) => a.feeInstallmentId).filter((id): id is string => Boolean(id));
  const installments = installmentIds.length
    ? await prisma.feeInstallment.findMany({
        where: { id: { in: installmentIds } },
        include: { plan: { include: { feeTariff: true } } },
      })
    : [];
  const installmentById = new Map(installments.map((i) => [i.id, i]));
  for (const allocation of input.allocations) {
    if (!allocation.feeInstallmentId) continue;
    const installment = installmentById.get(allocation.feeInstallmentId);
    if (!installment || installment.plan.feeTariff.feeTypeId !== allocation.feeTypeId) {
      throw new Error("Une des échéances sélectionnées ne correspond pas au type de frais indiqué.");
    }
  }

  const amount = input.allocations.reduce((sum, a) => sum + a.amount, 0);

  const paymentId = await prisma.$transaction(async (tx) => {
    const receiptNumber = await generateReceiptNumber(tx, {
      filiereId: enrollment.filiereId,
      academicYearId: activeYear.id,
    });
    const payment = await tx.payment.create({
      data: {
        receiptNumber,
        studentId: input.studentId,
        enrollmentId: enrollment.id,
        academicYearId: activeYear.id,
        cashRegisterSessionId: input.cashRegisterSessionId,
        paymentMethodId: input.paymentMethodId,
        amount,
        recordedBy: userId,
        verificationCode: randomUUID(),
        externalReference: input.externalReference ?? null,
        allocations: {
          create: input.allocations.map((a) => ({
            feeTypeId: a.feeTypeId,
            feeInstallmentId: a.feeInstallmentId ?? null,
            amount: a.amount,
          })),
        },
      },
    });
    return payment.id;
  });

  await syncEnrollmentPaymentStatus(enrollment.id);

  const row = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: PAYMENT_INCLUDE });

  // Module 7 — Comptabilité : écriture générée uniquement si les comptes sont configurés (voir MODULE-07 §1.2).
  await recordPaymentEntry({
    id: row.id,
    amount: Number(row.amount),
    createdAt: row.createdAt,
    recordedBy: row.recordedBy,
    receiptNumber: row.receiptNumber,
    paymentMethodId: row.paymentMethodId,
    allocations: row.allocations.map((a) => ({ feeTypeId: a.feeTypeId, amount: Number(a.amount) })),
  });

  // Module 12 — Centre de Communication : notification automatique obligatoire (voir MODULE-12 §1.11).
  // N'est jamais bloquante (notifyPayment n'échoue jamais bruyamment) : le paiement reste valide
  // même si aucune passerelle n'est configurée ou si l'envoi échoue.
  void notifyPayment({
    studentId: row.studentId,
    enrollmentId: row.enrollmentId,
    academicYearId: row.academicYearId,
    amount: Number(row.amount),
    receiptNumber: row.receiptNumber,
    paymentMethodLabel: row.paymentMethod.label,
    createdAt: row.createdAt,
  });

  // Centre de notifications (refonte UI/UX, phase finale, 2026-07-30) — confirmation interne pour
  // l'utilisateur qui a encaissé, distincte de `notifyPayment` (SMS/e-mail au tuteur, Module 12).
  void createInternalNotification(
    userId,
    "Paiement enregistré",
    `Reçu ${row.receiptNumber} — ${Number(row.amount).toLocaleString("fr-FR")} GNF pour ${fullName(row.student)}.`,
    { type: "payment", id: row.id }
  );

  return toPaymentDto(row);
}

/** Annulation sécurisée (MODULE-04.3 §1.7/§3 règle 6) : jamais de suppression physique, justification obligatoire, journalisée par l'appelant (routeur) dans audit_log. */
export async function cancelPayment(
  input: CancelPaymentInput,
  userId: string
): Promise<{ before: PaymentDto; after: PaymentDto }> {
  const current = await prisma.payment.findUniqueOrThrow({ where: { id: input.id }, include: PAYMENT_INCLUDE });
  if (current.status === "ANNULE") {
    throw new Error("Ce paiement est déjà annulé.");
  }
  const before = toPaymentDto(current);

  await prisma.payment.update({
    where: { id: input.id },
    data: { status: "ANNULE", cancelledAt: new Date(), cancelledReason: input.reason, cancelledBy: userId },
  });
  await syncEnrollmentPaymentStatus(current.enrollmentId);

  // Module 7 — Comptabilité : contre-passe l'écriture si le paiement avait été comptabilisé (voir MODULE-07 §1.2/§1.6).
  await recordPaymentCancellationEntry(input.id, userId);

  const row = await prisma.payment.findUniqueOrThrow({ where: { id: input.id }, include: PAYMENT_INCLUDE });
  return { before, after: toPaymentDto(row) };
}

export async function getPaymentById(id: string): Promise<PaymentDto> {
  const row = await prisma.payment.findUniqueOrThrow({ where: { id }, include: PAYMENT_INCLUDE });
  return toPaymentDto(row);
}

const EXPORT_ROW_CAP = 5000;

function buildPaymentsWhere(filter: ListPaymentsInput): Prisma.PaymentWhereInput {
  return {
    studentId: filter.studentId,
    OR: filter.search
      ? [
          { receiptNumber: { contains: filter.search, mode: "insensitive" } },
          { student: { matricule: { contains: filter.search, mode: "insensitive" } } },
          { student: { lastName: { contains: filter.search, mode: "insensitive" } } },
          { student: { firstName: { contains: filter.search, mode: "insensitive" } } },
        ]
      : undefined,
    recordedBy: filter.recordedBy,
    paymentMethodId: filter.paymentMethodId,
    status: filter.status,
    allocations: filter.feeTypeId ? { some: { feeTypeId: filter.feeTypeId } } : undefined,
    createdAt:
      filter.dateFrom || filter.dateTo
        ? { gte: filter.dateFrom, lte: filter.dateTo }
        : undefined,
  };
}

export async function listPayments(filter: ListPaymentsInput): Promise<ListPaymentsResult> {
  const where = buildPaymentsWhere(filter);

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: PAYMENT_INCLUDE,
      orderBy: { [filter.sortBy]: filter.sortDirection },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return { items: rows.map(toPaymentDto), total, page: filter.page, pageSize: filter.pageSize };
}

/** Export non paginé, plafonné (MODULE-04.3 §7.10) — même filtre que `listPayments`, sans la pagination. */
export async function listPaymentsForExport(filter: ListPaymentsInput): Promise<PaymentDto[]> {
  const where = buildPaymentsWhere(filter);
  const rows = await prisma.payment.findMany({
    where,
    include: PAYMENT_INCLUDE,
    orderBy: { [filter.sortBy]: filter.sortDirection },
    take: EXPORT_ROW_CAP,
  });
  return rows.map(toPaymentDto);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = startOfToday();
  const day = d.getDay();
  const diff = (day + 6) % 7; // lundi = début de semaine
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(): Date {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

/** Tableau de bord des paiements (MODULE-04.3 §7.9). */
export async function getPaymentDashboard(): Promise<PaymentDashboard> {
  const [todayPayments, weekTotal, monthTotal, outstanding] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "VALIDE", createdAt: { gte: startOfToday() } },
      include: { paymentMethod: true },
    }),
    prisma.payment.aggregate({
      where: { status: "VALIDE", createdAt: { gte: startOfWeek() } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "VALIDE", createdAt: { gte: startOfMonth() } },
      _sum: { amount: true },
    }),
    getTotalOutstandingForActiveYear(),
  ]);

  const byMethod = new Map<string, { paymentMethodLabel: string; total: number; count: number }>();
  for (const p of todayPayments) {
    const entry = byMethod.get(p.paymentMethodId) ?? { paymentMethodLabel: p.paymentMethod.label, total: 0, count: 0 };
    entry.total += Number(p.amount);
    entry.count += 1;
    byMethod.set(p.paymentMethodId, entry);
  }

  return {
    totalToday: todayPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    totalWeek: Number(weekTotal._sum.amount ?? 0),
    totalMonth: Number(monthTotal._sum.amount ?? 0),
    paymentCountToday: todayPayments.length,
    totalOutstanding: outstanding,
    byPaymentMethod: Array.from(byMethod.entries()).map(([paymentMethodId, v]) => ({ paymentMethodId, ...v })),
  };
}

export { toPaymentDto, PAYMENT_INCLUDE };
