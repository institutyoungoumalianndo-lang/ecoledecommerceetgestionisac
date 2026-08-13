import { z } from "zod";

export const auditResultSchema = z.enum(["SUCCES", "ECHEC"]);

export const auditLogEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  userDisplayName: z.string().nullable(),
  usernameInput: z.string().nullable(),
  action: z.string(),
  module: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  result: auditResultSchema,
  details: z.unknown().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

export const auditLogFilterInputSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  module: z.string().optional(),
  result: auditResultSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(200).default(50),
});
export type AuditLogFilterInput = z.infer<typeof auditLogFilterInputSchema>;

export const auditLogPageSchema = z.object({
  entries: z.array(auditLogEntrySchema),
  total: z.number().int(),
});
export type AuditLogPage = z.infer<typeof auditLogPageSchema>;
