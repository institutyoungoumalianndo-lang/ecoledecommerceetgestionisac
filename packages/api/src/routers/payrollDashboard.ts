import { getPayrollDashboardInputSchema, payrollDashboardSchema } from "@isac-erp/shared";
import * as payrollDashboardService from "../services/payrollDashboardService.js";
import { permissionProcedure, router } from "../trpc.js";

export const payrollDashboardRouter = router({
  get: permissionProcedure("PAIE:LECTURE")
    .input(getPayrollDashboardInputSchema)
    .output(payrollDashboardSchema)
    .query(({ input }) => payrollDashboardService.getPayrollDashboard(input)),
});
