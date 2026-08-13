import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createLevelInputSchema,
  levelIdInputSchema,
  levelSchema,
  updateLevelInputSchema,
} from "@isac-erp/shared";
import * as levelService from "../services/levelService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const levelsRouter = router({
  list: permissionProcedure("NIVEAUX:LECTURE")
    .output(z.array(levelSchema))
    .query(() => levelService.listLevels()),

  create: permissionProcedure("NIVEAUX:CREATION")
    .input(createLevelInputSchema)
    .output(levelSchema)
    .mutation(async ({ input, ctx }) => {
      const level = await levelService.createLevel(input);
      await logAction({
        userId: ctx.session.userId,
        action: "LEVEL_CREATE",
        module: "PARAMETRES",
        entityType: "Level",
        entityId: level.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return level;
    }),

  update: permissionProcedure("NIVEAUX:MODIFICATION")
    .input(updateLevelInputSchema)
    .output(levelSchema)
    .mutation(async ({ input, ctx }) => {
      const level = await levelService.updateLevel(input);
      await logAction({
        userId: ctx.session.userId,
        action: "LEVEL_UPDATE",
        module: "PARAMETRES",
        entityType: "Level",
        entityId: level.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return level;
    }),

  deactivate: permissionProcedure("NIVEAUX:SUPPRESSION")
    .input(levelIdInputSchema)
    .output(levelSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const level = await levelService.deactivateLevel(input.id);
        await logAction({
          userId: ctx.session.userId,
          action: "LEVEL_DEACTIVATE",
          module: "PARAMETRES",
          entityType: "Level",
          entityId: level.id,
          result: "SUCCES",
          ipAddress: ctx.ipAddress,
        });
        return level;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Désactivation impossible.",
        });
      }
    }),

  reactivate: permissionProcedure("NIVEAUX:MODIFICATION")
    .input(levelIdInputSchema)
    .output(levelSchema)
    .mutation(async ({ input, ctx }) => {
      const level = await levelService.reactivateLevel(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "LEVEL_REACTIVATE",
        module: "PARAMETRES",
        entityType: "Level",
        entityId: level.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return level;
    }),
});
