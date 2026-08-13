import {
  changeStudentClassInputSchema,
  listStudentEnrollmentsInputSchema,
  setEnrollmentDecisionInputSchema,
  studentEnrollmentSchema,
  updateEnrollmentPaymentInputSchema,
} from "@isac-erp/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as studentEnrollmentService from "../services/studentEnrollmentService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const studentEnrollmentsRouter = router({
  listByStudent: permissionProcedure("ETUDIANTS:LECTURE")
    .input(listStudentEnrollmentsInputSchema)
    .output(z.array(studentEnrollmentSchema))
    .query(({ input }) => studentEnrollmentService.listStudentEnrollments(input.studentId)),

  changeClass: permissionProcedure("ETUDIANTS:MODIFICATION")
    .input(changeStudentClassInputSchema)
    .output(studentEnrollmentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { before, after } = await studentEnrollmentService.changeStudentClass(input);
        await logAction({
          userId: ctx.session.userId,
          action: "STUDENT_ENROLLMENT_CLASS_CHANGE",
          module: "ETUDIANTS",
          entityType: "StudentEnrollment",
          entityId: after.id,
          result: "SUCCES",
          details: {
            before: { classId: before.classId, className: before.className, status: before.status },
            after: { classId: after.classId, className: after.className, status: after.status },
          },
          ipAddress: ctx.ipAddress,
        });
        return after;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Changement de classe impossible.",
        });
      }
    }),

  setDecision: permissionProcedure("ETUDIANTS:MODIFICATION")
    .input(setEnrollmentDecisionInputSchema)
    .output(studentEnrollmentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { before, after } = await studentEnrollmentService.setEnrollmentDecision(input);
        await logAction({
          userId: ctx.session.userId,
          action: "STUDENT_ENROLLMENT_DECISION",
          module: "ETUDIANTS",
          entityType: "StudentEnrollment",
          entityId: after.id,
          result: "SUCCES",
          details: { before: { decision: before.decision }, after: { decision: after.decision } },
          ipAddress: ctx.ipAddress,
        });
        return after;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Modification impossible.",
        });
      }
    }),

  updatePayment: permissionProcedure("INSCRIPTIONS:MODIFICATION")
    .input(updateEnrollmentPaymentInputSchema)
    .output(studentEnrollmentSchema)
    .mutation(async ({ input, ctx }) => {
      const { before, after } = await studentEnrollmentService.updateEnrollmentPayment(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ENROLLMENT_PAYMENT_UPDATE",
        module: "INSCRIPTIONS",
        entityType: "StudentEnrollment",
        entityId: after.id,
        result: "SUCCES",
        details: { before: { paymentStatus: before.paymentStatus }, after: { paymentStatus: after.paymentStatus } },
        ipAddress: ctx.ipAddress,
      });
      return after;
    }),
});
