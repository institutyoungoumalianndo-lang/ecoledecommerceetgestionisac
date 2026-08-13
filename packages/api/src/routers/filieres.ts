import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createFiliereInputSchema,
  filiereIdInputSchema,
  filiereSchema,
  updateFiliereInputSchema,
} from "@isac-erp/shared";
import * as filiereService from "../services/filiereService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const filieresRouter = router({
  list: permissionProcedure("FILIERES:LECTURE")
    .output(z.array(filiereSchema))
    .query(() => filiereService.listFilieres()),

  create: permissionProcedure("FILIERES:CREATION")
    .input(createFiliereInputSchema)
    .output(filiereSchema)
    .mutation(async ({ input, ctx }) => {
      const filiere = await filiereService.createFiliere(input);
      await logAction({
        userId: ctx.session.userId,
        action: "FILIERE_CREATE",
        module: "PARAMETRES",
        entityType: "Filiere",
        entityId: filiere.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return filiere;
    }),

  update: permissionProcedure("FILIERES:MODIFICATION")
    .input(updateFiliereInputSchema)
    .output(filiereSchema)
    .mutation(async ({ input, ctx }) => {
      const filiere = await filiereService.updateFiliere(input);
      await logAction({
        userId: ctx.session.userId,
        action: "FILIERE_UPDATE",
        module: "PARAMETRES",
        entityType: "Filiere",
        entityId: filiere.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return filiere;
    }),

  deactivate: permissionProcedure("FILIERES:SUPPRESSION")
    .input(filiereIdInputSchema)
    .output(filiereSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const filiere = await filiereService.deactivateFiliere(input.id);
        await logAction({
          userId: ctx.session.userId,
          action: "FILIERE_DEACTIVATE",
          module: "PARAMETRES",
          entityType: "Filiere",
          entityId: filiere.id,
          result: "SUCCES",
          ipAddress: ctx.ipAddress,
        });
        return filiere;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Désactivation impossible.",
        });
      }
    }),

  reactivate: permissionProcedure("FILIERES:MODIFICATION")
    .input(filiereIdInputSchema)
    .output(filiereSchema)
    .mutation(async ({ input, ctx }) => {
      const filiere = await filiereService.reactivateFiliere(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "FILIERE_REACTIVATE",
        module: "PARAMETRES",
        entityType: "Filiere",
        entityId: filiere.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return filiere;
    }),
});
