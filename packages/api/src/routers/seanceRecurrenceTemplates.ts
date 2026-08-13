import { z } from "zod";
import {
  createSeanceRecurrenceTemplateInputSchema,
  generateSeancesFromTemplateInputSchema,
  listSeanceRecurrenceTemplatesInputSchema,
  seanceRecurrenceTemplateIdInputSchema,
  seanceRecurrenceTemplateSchema,
  seanceSchema,
  updateSeanceRecurrenceTemplateInputSchema,
} from "@isac-erp/shared";
import * as seanceRecurrenceTemplateService from "../services/seanceRecurrenceTemplateService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const seanceRecurrenceTemplatesRouter = router({
  list: permissionProcedure("EMPLOI_DU_TEMPS:LECTURE")
    .input(listSeanceRecurrenceTemplatesInputSchema)
    .output(z.array(seanceRecurrenceTemplateSchema))
    .query(({ input }) => seanceRecurrenceTemplateService.listSeanceRecurrenceTemplates(input)),

  create: permissionProcedure("EMPLOI_DU_TEMPS:MODIFICATION")
    .input(createSeanceRecurrenceTemplateInputSchema)
    .output(seanceRecurrenceTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const template = await seanceRecurrenceTemplateService.createSeanceRecurrenceTemplate(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SEANCE_RECURRENCE_TEMPLATE_CREATE",
        module: "EMPLOI_DU_TEMPS",
        entityType: "SeanceRecurrenceTemplate",
        entityId: template.id,
        result: "SUCCES",
        details: { teacherId: input.teacherId, dayOfWeek: input.dayOfWeek },
        ipAddress: ctx.ipAddress,
      });
      return template;
    }),

  update: permissionProcedure("EMPLOI_DU_TEMPS:MODIFICATION")
    .input(updateSeanceRecurrenceTemplateInputSchema)
    .output(seanceRecurrenceTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const template = await seanceRecurrenceTemplateService.updateSeanceRecurrenceTemplate(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SEANCE_RECURRENCE_TEMPLATE_UPDATE",
        module: "EMPLOI_DU_TEMPS",
        entityType: "SeanceRecurrenceTemplate",
        entityId: template.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return template;
    }),

  deactivate: permissionProcedure("EMPLOI_DU_TEMPS:MODIFICATION")
    .input(seanceRecurrenceTemplateIdInputSchema)
    .output(seanceRecurrenceTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const template = await seanceRecurrenceTemplateService.deactivateSeanceRecurrenceTemplate(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SEANCE_RECURRENCE_TEMPLATE_DEACTIVATE",
        module: "EMPLOI_DU_TEMPS",
        entityType: "SeanceRecurrenceTemplate",
        entityId: template.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return template;
    }),

  reactivate: permissionProcedure("EMPLOI_DU_TEMPS:MODIFICATION")
    .input(seanceRecurrenceTemplateIdInputSchema)
    .output(seanceRecurrenceTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const template = await seanceRecurrenceTemplateService.reactivateSeanceRecurrenceTemplate(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SEANCE_RECURRENCE_TEMPLATE_REACTIVATE",
        module: "EMPLOI_DU_TEMPS",
        entityType: "SeanceRecurrenceTemplate",
        entityId: template.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return template;
    }),

  generateSeances: permissionProcedure("EMPLOI_DU_TEMPS:MODIFICATION")
    .input(generateSeancesFromTemplateInputSchema)
    .output(z.array(seanceSchema))
    .mutation(async ({ input, ctx }) => {
      const seances = await seanceRecurrenceTemplateService.generateSeancesFromTemplate(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SEANCE_RECURRENCE_TEMPLATE_GENERATE",
        module: "EMPLOI_DU_TEMPS",
        entityType: "SeanceRecurrenceTemplate",
        entityId: input.templateId,
        result: "SUCCES",
        details: { count: seances.length },
        ipAddress: ctx.ipAddress,
      });
      return seances;
    }),
});
