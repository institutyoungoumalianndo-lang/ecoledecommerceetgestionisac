import { teacherDashboardSchema } from "@isac-erp/shared";
import * as teacherDashboardService from "../services/teacherDashboardService.js";
import { permissionProcedure, router } from "../trpc.js";

export const teacherDashboardRouter = router({
  get: permissionProcedure("ENSEIGNANTS:LECTURE")
    .output(teacherDashboardSchema)
    .query(() => teacherDashboardService.getTeacherDashboard()),
});
