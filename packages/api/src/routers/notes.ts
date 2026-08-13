import {
  classStudentSchema,
  ligneSaisieNoteSchema,
  listClassStudentsInputSchema,
  listNotesForSaisieInputSchema,
  saisirNoteInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as noteService from "../services/noteService.js";
import { logAction } from "../services/auditService.js";
import { hasPermission } from "../security/authorization.js";
import { permissionProcedure, router } from "../trpc.js";

export const notesRouter = router({
  listForSaisie: permissionProcedure("NOTES:LECTURE")
    .input(listNotesForSaisieInputSchema)
    .output(z.array(ligneSaisieNoteSchema))
    .query(({ input }) => noteService.listNotesForSaisie(input)),

  listClassStudents: permissionProcedure("NOTES:LECTURE")
    .input(listClassStudentsInputSchema)
    .output(z.array(classStudentSchema))
    .query(({ input }) => noteService.listClassStudents(input.classId)),

  saisir: permissionProcedure("NOTES:MODIFICATION")
    .input(saisirNoteInputSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      const aPermissionAdministration = hasPermission(
        ctx.session.roleCode,
        ctx.session.permissionCodes,
        "NOTES:ADMINISTRATION"
      );
      await noteService.saisirNote(input, ctx.session.userId, aPermissionAdministration);
      await logAction({
        userId: ctx.session.userId,
        action: "NOTE_SAISIE",
        module: "NOTES",
        entityType: "Note",
        entityId: `${input.studentId}:${input.subjectOfferingId}`,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
    }),
});
