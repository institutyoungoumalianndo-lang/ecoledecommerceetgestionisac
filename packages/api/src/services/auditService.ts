import { prisma, type Prisma } from "@isac-erp/db";
import type { AuditLogFilterInput, AuditLogPage } from "@isac-erp/shared";

export interface LogEntryOptions {
  userId?: string | null;
  usernameInput?: string | null;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  result: "SUCCES" | "ECHEC";
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Point d'entrée unique du journal d'audit — utilisé par ce module et,
 * demain, par tous les modules métier (voir MODULE-01 §2.10/§3.6). Ne jamais
 * écrire directement dans la table audit_log ailleurs que via cette fonction.
 */
export async function logAction(options: LogEntryOptions): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: options.userId ?? null,
      usernameInput: options.usernameInput ?? null,
      action: options.action,
      module: options.module,
      entityType: options.entityType,
      entityId: options.entityId,
      result: options.result,
      details: options.details as Prisma.InputJsonValue | undefined,
      ipAddress: options.ipAddress,
    },
  });
}

export async function listAuditLog(filter: AuditLogFilterInput): Promise<AuditLogPage> {
  const where = {
    userId: filter.userId,
    action: filter.action,
    module: filter.module,
    result: filter.result,
    createdAt:
      filter.dateFrom || filter.dateTo
        ? { gte: filter.dateFrom, lte: filter.dateTo }
        : undefined,
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    entries: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userDisplayName: row.user ? `${row.user.firstName} ${row.user.lastName}` : null,
      usernameInput: row.usernameInput,
      action: row.action,
      module: row.module,
      entityType: row.entityType,
      entityId: row.entityId,
      result: row.result,
      details: row.details,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
    })),
    total,
  };
}
