import { pedagogicalDashboardSchema } from "@isac-erp/shared";
import * as pedagogicalDashboardService from "../services/pedagogicalDashboardService.js";
import { permissionProcedure, router } from "../trpc.js";

export const pedagogicalDashboardRouter = router({
  get: permissionProcedure("MATIERES:LECTURE")
    .output(pedagogicalDashboardSchema)
    .query(() => pedagogicalDashboardService.getPedagogicalDashboard()),
});
