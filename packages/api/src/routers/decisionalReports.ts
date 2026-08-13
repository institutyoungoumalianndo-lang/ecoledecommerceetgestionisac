import {
  financialTrendsInputSchema,
  financialTrendsReportSchema,
  pedagogicalPerformanceInputSchema,
  pedagogicalPerformanceReportSchema,
} from "@isac-erp/shared";
import { getPedagogicalPerformanceReport } from "../services/pedagogicalPerformanceService.js";
import { getFinancialTrendsReport } from "../services/financialTrendsService.js";
import { permissionProcedure, router } from "../trpc.js";

export const decisionalReportsRouter = router({
  pedagogicalPerformance: permissionProcedure("RAPPORTS_DECISIONNELS:LECTURE")
    .input(pedagogicalPerformanceInputSchema)
    .output(pedagogicalPerformanceReportSchema)
    .query(({ input }) => getPedagogicalPerformanceReport(input)),

  financialTrends: permissionProcedure("RAPPORTS_DECISIONNELS:LECTURE")
    .input(financialTrendsInputSchema)
    .output(financialTrendsReportSchema)
    .query(({ input }) => getFinancialTrendsReport(input)),
});
