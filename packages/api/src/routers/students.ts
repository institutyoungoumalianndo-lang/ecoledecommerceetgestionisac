import {
  archiveStudentInputSchema,
  checkStudentDuplicatesInputSchema,
  createStudentInputSchema,
  studentDuplicateMatchSchema,
  studentIdInputSchema,
  studentInaExportRowSchema,
  studentListFilterInputSchema,
  studentListPageSchema,
  studentListRowSchema,
  studentSchema,
  updateStudentInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as studentService from "../services/studentService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const studentsRouter = router({
  list: permissionProcedure("ETUDIANTS:LECTURE")
    .input(studentListFilterInputSchema)
    .output(studentListPageSchema)
    .query(({ input }) => studentService.listStudents(input)),

  listForExport: permissionProcedure("ETUDIANTS:EXPORT")
    .input(studentListFilterInputSchema.omit({ page: true, pageSize: true }))
    .output(z.array(studentListRowSchema))
    .query(({ input }) => studentService.listStudentsForExport(input)),

  // Canevas national INA (2026-08-03, retour du porteur du projet) — colonnes distinctes du tableau
  // interne, voir studentInaExportRowSchema.
  listForInaExport: permissionProcedure("ETUDIANTS:EXPORT")
    .input(studentListFilterInputSchema.omit({ page: true, pageSize: true }))
    .output(z.array(studentInaExportRowSchema))
    .query(({ input }) => studentService.listStudentsForInaExport(input)),

  getById: permissionProcedure("ETUDIANTS:LECTURE")
    .input(studentIdInputSchema)
    .output(studentSchema)
    .query(({ input }) => studentService.getStudentById(input.id)),

  // Mutation plutôt que query : appelée juste avant la soumission du
  // formulaire de création (aucune écriture ici), pas comme une donnée
  // réactive à mettre en cache.
  checkDuplicates: permissionProcedure("ETUDIANTS:LECTURE")
    .input(checkStudentDuplicatesInputSchema)
    .output(z.array(studentDuplicateMatchSchema))
    .mutation(({ input }) => studentService.checkStudentDuplicates(input)),

  create: permissionProcedure("ETUDIANTS:CREATION")
    .input(createStudentInputSchema)
    .output(studentSchema)
    .mutation(async ({ input, ctx }) => {
      const student = await studentService.createStudent(input);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_CREATE",
        module: "ETUDIANTS",
        entityType: "Student",
        entityId: student.id,
        result: "SUCCES",
        details: { matricule: student.matricule, duplicateWarningAcknowledged: input.duplicateWarningAcknowledged ?? false },
        ipAddress: ctx.ipAddress,
      });
      return student;
    }),

  update: permissionProcedure("ETUDIANTS:MODIFICATION")
    .input(updateStudentInputSchema)
    .output(studentSchema)
    .mutation(async ({ input, ctx }) => {
      const student = await studentService.updateStudent(input);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_UPDATE",
        module: "ETUDIANTS",
        entityType: "Student",
        entityId: student.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return student;
    }),

  archive: permissionProcedure("ETUDIANTS:SUPPRESSION")
    .input(archiveStudentInputSchema)
    .output(studentSchema)
    .mutation(async ({ input, ctx }) => {
      const student = await studentService.archiveStudent(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_ARCHIVE",
        module: "ETUDIANTS",
        entityType: "Student",
        entityId: student.id,
        result: "SUCCES",
        details: { reason: input.reason },
        ipAddress: ctx.ipAddress,
      });
      return student;
    }),

  restore: permissionProcedure("ETUDIANTS:SUPPRESSION")
    .input(studentIdInputSchema)
    .output(studentSchema)
    .mutation(async ({ input, ctx }) => {
      const student = await studentService.restoreStudent(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_RESTORE",
        module: "ETUDIANTS",
        entityType: "Student",
        entityId: student.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return student;
    }),
});
