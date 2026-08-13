import { z } from "zod";
import {
  createTeacherContractTypeInputSchema,
  teacherContractTypeIdInputSchema,
  teacherContractTypeSchema,
  updateTeacherContractTypeInputSchema,
} from "@isac-erp/shared";
import * as teacherContractTypeService from "../services/teacherContractTypeService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const teacherContractTypesRouter = router({
  list: permissionProcedure("ENSEIGNANTS:LECTURE")
    .output(z.array(teacherContractTypeSchema))
    .query(() => teacherContractTypeService.listTeacherContractTypes()),

  create: permissionProcedure("ENSEIGNANTS:ADMINISTRATION")
    .input(createTeacherContractTypeInputSchema)
    .output(teacherContractTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const contractType = await teacherContractTypeService.createTeacherContractType(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_CONTRACT_TYPE_CREATE",
        module: "ENSEIGNANTS",
        entityType: "TeacherContractType",
        entityId: contractType.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return contractType;
    }),

  update: permissionProcedure("ENSEIGNANTS:ADMINISTRATION")
    .input(updateTeacherContractTypeInputSchema)
    .output(teacherContractTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const contractType = await teacherContractTypeService.updateTeacherContractType(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_CONTRACT_TYPE_UPDATE",
        module: "ENSEIGNANTS",
        entityType: "TeacherContractType",
        entityId: contractType.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return contractType;
    }),

  deactivate: permissionProcedure("ENSEIGNANTS:ADMINISTRATION")
    .input(teacherContractTypeIdInputSchema)
    .output(teacherContractTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const contractType = await teacherContractTypeService.deactivateTeacherContractType(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_CONTRACT_TYPE_DEACTIVATE",
        module: "ENSEIGNANTS",
        entityType: "TeacherContractType",
        entityId: contractType.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return contractType;
    }),

  reactivate: permissionProcedure("ENSEIGNANTS:ADMINISTRATION")
    .input(teacherContractTypeIdInputSchema)
    .output(teacherContractTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const contractType = await teacherContractTypeService.reactivateTeacherContractType(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_CONTRACT_TYPE_REACTIVATE",
        module: "ENSEIGNANTS",
        entityType: "TeacherContractType",
        entityId: contractType.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return contractType;
    }),
});
