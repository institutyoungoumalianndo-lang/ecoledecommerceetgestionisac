import { z } from "zod";
import {
  createPedagogicalGroupInputSchema,
  listPedagogicalGroupsInputSchema,
  pedagogicalGroupIdInputSchema,
  pedagogicalGroupSchema,
  updatePedagogicalGroupInputSchema,
} from "@isac-erp/shared";
import * as pedagogicalGroupService from "../services/pedagogicalGroupService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const pedagogicalGroupsRouter = router({
  list: permissionProcedure("GROUPES_PEDAGOGIQUES:LECTURE")
    .input(listPedagogicalGroupsInputSchema)
    .output(z.array(pedagogicalGroupSchema))
    .query(({ input }) => pedagogicalGroupService.listPedagogicalGroups(input)),

  create: permissionProcedure("GROUPES_PEDAGOGIQUES:MODIFICATION")
    .input(createPedagogicalGroupInputSchema)
    .output(pedagogicalGroupSchema)
    .mutation(async ({ input, ctx }) => {
      const group = await pedagogicalGroupService.createPedagogicalGroup(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PEDAGOGICAL_GROUP_CREATE",
        module: "GROUPES_PEDAGOGIQUES",
        entityType: "PedagogicalGroup",
        entityId: group.id,
        result: "SUCCES",
        details: { classIds: input.classIds },
        ipAddress: ctx.ipAddress,
      });
      return group;
    }),

  update: permissionProcedure("GROUPES_PEDAGOGIQUES:MODIFICATION")
    .input(updatePedagogicalGroupInputSchema)
    .output(pedagogicalGroupSchema)
    .mutation(async ({ input, ctx }) => {
      const group = await pedagogicalGroupService.updatePedagogicalGroup(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PEDAGOGICAL_GROUP_UPDATE",
        module: "GROUPES_PEDAGOGIQUES",
        entityType: "PedagogicalGroup",
        entityId: group.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return group;
    }),

  deactivate: permissionProcedure("GROUPES_PEDAGOGIQUES:MODIFICATION")
    .input(pedagogicalGroupIdInputSchema)
    .output(pedagogicalGroupSchema)
    .mutation(async ({ input, ctx }) => {
      const group = await pedagogicalGroupService.deactivatePedagogicalGroup(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "PEDAGOGICAL_GROUP_DEACTIVATE",
        module: "GROUPES_PEDAGOGIQUES",
        entityType: "PedagogicalGroup",
        entityId: group.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return group;
    }),

  reactivate: permissionProcedure("GROUPES_PEDAGOGIQUES:MODIFICATION")
    .input(pedagogicalGroupIdInputSchema)
    .output(pedagogicalGroupSchema)
    .mutation(async ({ input, ctx }) => {
      const group = await pedagogicalGroupService.reactivatePedagogicalGroup(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "PEDAGOGICAL_GROUP_REACTIVATE",
        module: "GROUPES_PEDAGOGIQUES",
        entityType: "PedagogicalGroup",
        entityId: group.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return group;
    }),
});
