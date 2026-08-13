import { communicationDashboardSchema } from "@isac-erp/shared";
import * as communicationDashboardService from "../services/communicationDashboardService.js";
import { permissionProcedure, router } from "../trpc.js";

export const communicationDashboardRouter = router({
  get: permissionProcedure("COMMUNICATION:LECTURE")
    .output(communicationDashboardSchema)
    .query(() => communicationDashboardService.getCommunicationDashboard()),
});
