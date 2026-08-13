import { z } from "zod";

export const pedagogicalDashboardSchema = z.object({
  filiereCount: z.number().int(),
  levelCount: z.number().int(),
  classCount: z.number().int(),
  subjectCount: z.number().int(),
  teachingUnitCount: z.number().int(),
  hoursByType: z.object({
    course: z.number().int(),
    td: z.number().int(),
    tp: z.number().int(),
    personalWork: z.number().int(),
  }),
  creditsByFiliere: z.array(z.object({ filiereId: z.string().uuid(), filiereName: z.string(), totalCredits: z.number() })),
});
export type PedagogicalDashboard = z.infer<typeof pedagogicalDashboardSchema>;
