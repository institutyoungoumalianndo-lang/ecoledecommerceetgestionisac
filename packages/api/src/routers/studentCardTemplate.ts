import { studentCardTemplateSchema, updateStudentCardTemplateInputSchema } from "@isac-erp/shared";
import * as studentCardTemplateService from "../services/documents/studentCardTemplateService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, publicProcedure, router } from "../trpc.js";

export const studentCardTemplateRouter = router({
  // Public en lecture : le moteur de génération doit pouvoir y accéder, comme l'en-tête institutionnelle (Module 9).
  get: publicProcedure.output(studentCardTemplateSchema).query(() => studentCardTemplateService.getStudentCardTemplate()),

  update: permissionProcedure("PARAMETRES_DOCUMENTS:MODIFICATION")
    .input(updateStudentCardTemplateInputSchema)
    .output(studentCardTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const { before, after } = await studentCardTemplateService.updateStudentCardTemplate(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SETTINGS_STUDENT_CARD_TEMPLATE_UPDATE",
        module: "PARAMETRES",
        result: "SUCCES",
        details: { before, after },
        ipAddress: ctx.ipAddress,
      });
      return after;
    }),
});
