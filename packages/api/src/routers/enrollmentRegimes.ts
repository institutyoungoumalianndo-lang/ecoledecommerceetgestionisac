import { z } from "zod";
import {
  createEnrollmentRegimeInputSchema,
  enrollmentRegimeIdInputSchema,
  enrollmentRegimeSchema,
  updateEnrollmentRegimeInputSchema,
} from "@isac-erp/shared";
import * as enrollmentRegimeService from "../services/enrollmentRegimeService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const enrollmentRegimesRouter = router({
  list: permissionProcedure("INSCRIPTIONS:LECTURE")
    .output(z.array(enrollmentRegimeSchema))
    .query(() => enrollmentRegimeService.listEnrollmentRegimes()),

  create: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .input(createEnrollmentRegimeInputSchema)
    .output(enrollmentRegimeSchema)
    .mutation(async ({ input, ctx }) => {
      const regime = await enrollmentRegimeService.createEnrollmentRegime(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ENROLLMENT_REGIME_CREATE",
        module: "INSCRIPTIONS",
        entityType: "EnrollmentRegime",
        entityId: regime.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return regime;
    }),

  update: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .input(updateEnrollmentRegimeInputSchema)
    .output(enrollmentRegimeSchema)
    .mutation(async ({ input, ctx }) => {
      const regime = await enrollmentRegimeService.updateEnrollmentRegime(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ENROLLMENT_REGIME_UPDATE",
        module: "INSCRIPTIONS",
        entityType: "EnrollmentRegime",
        entityId: regime.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return regime;
    }),

  deactivate: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .input(enrollmentRegimeIdInputSchema)
    .output(enrollmentRegimeSchema)
    .mutation(async ({ input, ctx }) => {
      const regime = await enrollmentRegimeService.deactivateEnrollmentRegime(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "ENROLLMENT_REGIME_DEACTIVATE",
        module: "INSCRIPTIONS",
        entityType: "EnrollmentRegime",
        entityId: regime.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return regime;
    }),

  reactivate: permissionProcedure("INSCRIPTIONS:ADMINISTRATION")
    .input(enrollmentRegimeIdInputSchema)
    .output(enrollmentRegimeSchema)
    .mutation(async ({ input, ctx }) => {
      const regime = await enrollmentRegimeService.reactivateEnrollmentRegime(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "ENROLLMENT_REGIME_REACTIVATE",
        module: "INSCRIPTIONS",
        entityType: "EnrollmentRegime",
        entityId: regime.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return regime;
    }),
});
