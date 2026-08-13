import { z } from "zod";
import {
  createTeachingUnitInputSchema,
  teachingUnitSchema,
  updateTeachingUnitInputSchema,
} from "@isac-erp/shared";
import * as teachingUnitService from "../services/teachingUnitService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const teachingUnitsRouter = router({
  list: permissionProcedure("MATIERES:LECTURE")
    .output(z.array(teachingUnitSchema))
    .query(() => teachingUnitService.listTeachingUnits()),

  getById: permissionProcedure("MATIERES:LECTURE")
    .input(z.object({ id: z.string().uuid() }))
    .output(teachingUnitSchema)
    .query(({ input }) => teachingUnitService.getTeachingUnitById(input.id)),

  create: permissionProcedure("MATIERES:ADMINISTRATION")
    .input(createTeachingUnitInputSchema)
    .output(teachingUnitSchema)
    .mutation(async ({ input, ctx }) => {
      const unit = await teachingUnitService.createTeachingUnit(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHING_UNIT_CREATE",
        module: "MATIERES",
        entityType: "TeachingUnit",
        entityId: unit.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return unit;
    }),

  update: permissionProcedure("MATIERES:ADMINISTRATION")
    .input(updateTeachingUnitInputSchema)
    .output(teachingUnitSchema)
    .mutation(async ({ input, ctx }) => {
      const unit = await teachingUnitService.updateTeachingUnit(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHING_UNIT_UPDATE",
        module: "MATIERES",
        entityType: "TeachingUnit",
        entityId: unit.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return unit;
    }),

  deactivate: permissionProcedure("MATIERES:ADMINISTRATION")
    .input(z.object({ id: z.string().uuid() }))
    .output(teachingUnitSchema)
    .mutation(async ({ input, ctx }) => {
      const unit = await teachingUnitService.deactivateTeachingUnit(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHING_UNIT_DEACTIVATE",
        module: "MATIERES",
        entityType: "TeachingUnit",
        entityId: unit.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return unit;
    }),
});
