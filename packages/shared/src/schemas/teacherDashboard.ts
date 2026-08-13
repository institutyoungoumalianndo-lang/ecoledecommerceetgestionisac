import { z } from "zod";

/** Tableau de bord Enseignants (MODULE-05 §1.9/§10.9) — répartitions calculées à la volée. */
export const teacherDashboardSchema = z.object({
  totalCount: z.number().int(),
  byStatus: z.array(z.object({ statusLabel: z.string(), count: z.number().int() })),
  bySpecialty: z.array(z.object({ specialty: z.string(), count: z.number().int() })),
  averageWeeklyHours: z.number(),
  availableCount: z.number().int(),
});
export type TeacherDashboard = z.infer<typeof teacherDashboardSchema>;
