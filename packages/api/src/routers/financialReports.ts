import { z } from "zod";
import {
  financialDashboardSchema,
  financialReportByCashRegisterSchema,
  financialReportByCategorySchema,
  financialReportByPeriodSchema,
  financialReportByUserSchema,
  financialReportPeriodInputSchema,
  generalLedgerInputSchema,
  generalLedgerResultSchema,
  revenueSummaryInputSchema,
  revenueSummarySchema,
  trialBalanceInputSchema,
  trialBalanceResultSchema,
} from "@isac-erp/shared";
import * as financialReportService from "../services/financialReportService.js";
import { permissionProcedure, router } from "../trpc.js";

const dateRangeInputSchema = z.object({ dateFrom: z.coerce.date().optional(), dateTo: z.coerce.date().optional() });

export const financialReportsRouter = router({
  generalLedger: permissionProcedure("ECRITURES:LECTURE")
    .input(generalLedgerInputSchema)
    .output(generalLedgerResultSchema)
    .query(({ input }) => financialReportService.getGeneralLedger(input)),

  trialBalance: permissionProcedure("ECRITURES:LECTURE")
    .input(trialBalanceInputSchema)
    .output(trialBalanceResultSchema)
    .query(({ input }) => financialReportService.getTrialBalance(input)),

  dashboard: permissionProcedure("RAPPORTS_FINANCIERS:LECTURE")
    .output(financialDashboardSchema)
    .query(() => financialReportService.getFinancialDashboard()),

  byPeriod: permissionProcedure("RAPPORTS_FINANCIERS:LECTURE")
    .input(financialReportPeriodInputSchema)
    .output(financialReportByPeriodSchema)
    .query(({ input }) => financialReportService.getReportByPeriod(input)),

  byCategory: permissionProcedure("RAPPORTS_FINANCIERS:LECTURE")
    .input(dateRangeInputSchema)
    .output(financialReportByCategorySchema)
    .query(({ input }) => financialReportService.getReportByCategory(input.dateFrom, input.dateTo)),

  byUser: permissionProcedure("RAPPORTS_FINANCIERS:LECTURE")
    .input(dateRangeInputSchema)
    .output(financialReportByUserSchema)
    .query(({ input }) => financialReportService.getReportByUser(input.dateFrom, input.dateTo)),

  byCashRegister: permissionProcedure("RAPPORTS_FINANCIERS:LECTURE")
    .input(dateRangeInputSchema)
    .output(financialReportByCashRegisterSchema)
    .query(({ input }) => financialReportService.getReportByCashRegister(input.dateFrom, input.dateTo)),

  revenueSummary: permissionProcedure("RAPPORTS_FINANCIERS:LECTURE")
    .input(revenueSummaryInputSchema)
    .output(revenueSummarySchema)
    .query(({ input }) => financialReportService.getRevenueSummary(input)),
});
