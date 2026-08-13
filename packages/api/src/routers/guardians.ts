import {
  guardianSchema,
  guardianSearchInputSchema,
  linkGuardianInputSchema,
  listStudentGuardiansInputSchema,
  setPrimaryContactInputSchema,
  studentGuardianIdInputSchema,
  studentGuardianSchema,
  updateGuardianInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as guardianService from "../services/guardianService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const guardiansRouter = router({
  search: permissionProcedure("ETUDIANTS:LECTURE")
    .input(guardianSearchInputSchema)
    .output(z.array(guardianSchema))
    .query(({ input }) => guardianService.searchGuardians(input.search)),

  listByStudent: permissionProcedure("ETUDIANTS:LECTURE")
    .input(listStudentGuardiansInputSchema)
    .output(z.array(studentGuardianSchema))
    .query(({ input }) => guardianService.listStudentGuardians(input.studentId)),

  update: permissionProcedure("ETUDIANTS:MODIFICATION")
    .input(updateGuardianInputSchema)
    .output(guardianSchema)
    .mutation(async ({ input, ctx }) => {
      const guardian = await guardianService.updateGuardian(input);
      await logAction({
        userId: ctx.session.userId,
        action: "GUARDIAN_UPDATE",
        module: "ETUDIANTS",
        entityType: "Guardian",
        entityId: guardian.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return guardian;
    }),

  link: permissionProcedure("ETUDIANTS:MODIFICATION")
    .input(linkGuardianInputSchema)
    .output(studentGuardianSchema)
    .mutation(async ({ input, ctx }) => {
      const link = await guardianService.linkGuardian(input);
      await logAction({
        userId: ctx.session.userId,
        action: "GUARDIAN_LINK",
        module: "ETUDIANTS",
        entityType: "Student",
        entityId: input.studentId,
        result: "SUCCES",
        details: { guardianId: link.guardianId, relationship: link.relationship },
        ipAddress: ctx.ipAddress,
      });
      return link;
    }),

  unlink: permissionProcedure("ETUDIANTS:MODIFICATION")
    .input(studentGuardianIdInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await guardianService.unlinkGuardian(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "GUARDIAN_UNLINK",
        module: "ETUDIANTS",
        entityType: "StudentGuardian",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),

  setPrimaryContact: permissionProcedure("ETUDIANTS:MODIFICATION")
    .input(setPrimaryContactInputSchema)
    .output(studentGuardianSchema)
    .mutation(async ({ input, ctx }) => {
      const link = await guardianService.setPrimaryContact(input);
      await logAction({
        userId: ctx.session.userId,
        action: "GUARDIAN_SET_PRIMARY_CONTACT",
        module: "ETUDIANTS",
        entityType: "Student",
        entityId: input.studentId,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return link;
    }),
});
