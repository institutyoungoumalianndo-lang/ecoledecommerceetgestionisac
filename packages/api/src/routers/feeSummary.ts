import {
  feeDashboardInputSchema,
  feeDashboardSchema,
  getStudentFeeSummaryInputSchema,
  studentFeeSummarySchema,
} from "@isac-erp/shared";
import * as feeSummaryService from "../services/feeSummaryService.js";
import { permissionProcedure, router } from "../trpc.js";

export const feeSummaryRouter = router({
  getForStudent: permissionProcedure("FRAIS:LECTURE")
    .input(getStudentFeeSummaryInputSchema)
    .output(studentFeeSummarySchema)
    .query(({ input }) => feeSummaryService.getStudentFeeSummary(input)),

  dashboard: permissionProcedure("FRAIS:LECTURE")
    .input(feeDashboardInputSchema)
    .output(feeDashboardSchema)
    .query(({ input }) => feeSummaryService.getFeeDashboard(input)),
});
