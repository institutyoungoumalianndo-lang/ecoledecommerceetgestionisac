import { z } from "zod";
import {
  createSchoolClassInputSchema,
  schoolClassIdInputSchema,
  schoolClassSchema,
  updateSchoolClassInputSchema,
} from "@isac-erp/shared";
import * as schoolClassService from "../services/schoolClassService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const schoolClassesRouter = router({
  list: permissionProcedure("CLASSES:LECTURE")
    .input(z.object({ academicYearId: z.string().uuid().optional() }))
    .output(z.array(schoolClassSchema))
    .query(({ input }) => schoolClassService.listSchoolClasses(input.academicYearId)),

  create: permissionProcedure("CLASSES:CREATION")
    .input(createSchoolClassInputSchema)
    .output(schoolClassSchema)
    .mutation(async ({ input, ctx }) => {
      const schoolClass = await schoolClassService.createSchoolClass(input);
      await logAction({
        userId: ctx.session.userId,
        action: "CLASS_CREATE",
        module: "PARAMETRES",
        entityType: "Class",
        entityId: schoolClass.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return schoolClass;
    }),

  update: permissionProcedure("CLASSES:MODIFICATION")
    .input(updateSchoolClassInputSchema)
    .output(schoolClassSchema)
    .mutation(async ({ input, ctx }) => {
      const schoolClass = await schoolClassService.updateSchoolClass(input);
      await logAction({
        userId: ctx.session.userId,
        action: "CLASS_UPDATE",
        module: "PARAMETRES",
        entityType: "Class",
        entityId: schoolClass.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return schoolClass;
    }),

  deactivate: permissionProcedure("CLASSES:SUPPRESSION")
    .input(schoolClassIdInputSchema)
    .output(schoolClassSchema)
    .mutation(async ({ input, ctx }) => {
      const schoolClass = await schoolClassService.deactivateSchoolClass(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "CLASS_DEACTIVATE",
        module: "PARAMETRES",
        entityType: "Class",
        entityId: schoolClass.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return schoolClass;
    }),

  reactivate: permissionProcedure("CLASSES:MODIFICATION")
    .input(schoolClassIdInputSchema)
    .output(schoolClassSchema)
    .mutation(async ({ input, ctx }) => {
      const schoolClass = await schoolClassService.reactivateSchoolClass(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "CLASS_REACTIVATE",
        module: "PARAMETRES",
        entityType: "Class",
        entityId: schoolClass.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return schoolClass;
    }),
});
