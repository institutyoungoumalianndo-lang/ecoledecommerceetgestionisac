import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  cancelEnrollmentInputSchema,
  checkEnrollmentConditionsInputSchema,
  createEnrollmentInputSchema,
  enrollmentConditionsResultSchema,
  enrollmentDashboardInputSchema,
  enrollmentDashboardSchema,
  enrollmentListFilterInputSchema,
  enrollmentListPageSchema,
  enrollmentListRowSchema,
  studentEnrollmentSchema,
} from "@isac-erp/shared";
import * as enrollmentService from "../services/enrollmentService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const enrollmentsRouter = router({
  list: permissionProcedure("INSCRIPTIONS:LECTURE")
    .input(enrollmentListFilterInputSchema)
    .output(enrollmentListPageSchema)
    .query(({ input }) => enrollmentService.listEnrollments(input)),

  listForExport: permissionProcedure("INSCRIPTIONS:EXPORT")
    .input(enrollmentListFilterInputSchema.omit({ page: true, pageSize: true }))
    .output(z.array(enrollmentListRowSchema))
    .query(({ input }) => enrollmentService.listEnrollmentsForExport(input)),

  dashboard: permissionProcedure("INSCRIPTIONS:LECTURE")
    .input(enrollmentDashboardInputSchema)
    .output(enrollmentDashboardSchema)
    .query(({ input }) => enrollmentService.getEnrollmentDashboard(input)),

  checkConditions: permissionProcedure("INSCRIPTIONS:LECTURE")
    .input(checkEnrollmentConditionsInputSchema)
    .output(enrollmentConditionsResultSchema)
    .query(({ input }) => enrollmentService.checkEnrollmentConditions(input)),

  create: permissionProcedure("INSCRIPTIONS:CREATION")
    .input(createEnrollmentInputSchema)
    .output(studentEnrollmentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const enrollment = await enrollmentService.createEnrollment(input);
        await logAction({
          userId: ctx.session.userId,
          action: "ENROLLMENT_CREATE",
          module: "INSCRIPTIONS",
          entityType: "StudentEnrollment",
          entityId: enrollment.id,
          result: "SUCCES",
          details: { registrationNumber: enrollment.registrationNumber, status: enrollment.status },
          ipAddress: ctx.ipAddress,
        });
        return enrollment;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Inscription impossible.",
        });
      }
    }),

  cancel: permissionProcedure("INSCRIPTIONS:SUPPRESSION")
    .input(cancelEnrollmentInputSchema)
    .output(studentEnrollmentSchema)
    .mutation(async ({ input, ctx }) => {
      const { after } = await enrollmentService.cancelEnrollment(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "ENROLLMENT_CANCEL",
        module: "INSCRIPTIONS",
        entityType: "StudentEnrollment",
        entityId: after.id,
        result: "SUCCES",
        details: { reason: input.reason },
        ipAddress: ctx.ipAddress,
      });
      return after;
    }),
});
