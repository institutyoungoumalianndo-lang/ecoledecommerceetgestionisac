import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createSubjectOfferingInputSchema,
  listSubjectOfferingsInputSchema,
  subjectOfferingSchema,
  updateSubjectOfferingInputSchema,
} from "@isac-erp/shared";
import * as subjectOfferingService from "../services/subjectOfferingService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const subjectOfferingsRouter = router({
  list: permissionProcedure("MATIERES:LECTURE")
    .input(listSubjectOfferingsInputSchema)
    .output(z.array(subjectOfferingSchema))
    .query(({ input }) => subjectOfferingService.listSubjectOfferings(input)),

  getById: permissionProcedure("MATIERES:LECTURE")
    .input(z.object({ id: z.string().uuid() }))
    .output(subjectOfferingSchema)
    .query(({ input }) => subjectOfferingService.getSubjectOfferingById(input.id)),

  create: permissionProcedure("MATIERES:CREATION")
    .input(createSubjectOfferingInputSchema)
    .output(subjectOfferingSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const offering = await subjectOfferingService.createSubjectOffering(input);
        await logAction({
          userId: ctx.session.userId,
          action: "SUBJECT_OFFERING_CREATE",
          module: "MATIERES",
          entityType: "SubjectOffering",
          entityId: offering.id,
          result: "SUCCES",
          details: { subjectId: offering.subjectId, coefficient: offering.coefficient },
          ipAddress: ctx.ipAddress,
        });
        return offering;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Création de l'affectation impossible.",
        });
      }
    }),

  update: permissionProcedure("MATIERES:MODIFICATION")
    .input(updateSubjectOfferingInputSchema)
    .output(subjectOfferingSchema)
    .mutation(async ({ input, ctx }) => {
      const offering = await subjectOfferingService.updateSubjectOffering(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SUBJECT_OFFERING_UPDATE",
        module: "MATIERES",
        entityType: "SubjectOffering",
        entityId: offering.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return offering;
    }),

  deactivate: permissionProcedure("MATIERES:SUPPRESSION")
    .input(z.object({ id: z.string().uuid() }))
    .output(subjectOfferingSchema)
    .mutation(async ({ input, ctx }) => {
      const offering = await subjectOfferingService.deactivateSubjectOffering(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SUBJECT_OFFERING_DEACTIVATE",
        module: "MATIERES",
        entityType: "SubjectOffering",
        entityId: offering.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return offering;
    }),

  reactivate: permissionProcedure("MATIERES:MODIFICATION")
    .input(z.object({ id: z.string().uuid() }))
    .output(subjectOfferingSchema)
    .mutation(async ({ input, ctx }) => {
      const offering = await subjectOfferingService.reactivateSubjectOffering(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SUBJECT_OFFERING_REACTIVATE",
        module: "MATIERES",
        entityType: "SubjectOffering",
        entityId: offering.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return offering;
    }),
});
