import { z } from "zod";
import { scheduleBuilderAssignmentSchema, scheduleBuilderFilterInputSchema } from "@isac-erp/shared";
import * as scheduleBuilderService from "../services/scheduleBuilderService.js";
import { permissionProcedure, router } from "../trpc.js";

export const scheduleBuilderRouter = router({
  list: permissionProcedure("EMPLOI_DU_TEMPS:LECTURE")
    .input(scheduleBuilderFilterInputSchema)
    .output(z.array(scheduleBuilderAssignmentSchema))
    .query(({ input }) => scheduleBuilderService.listScheduleBuilderAssignments(input)),
});
