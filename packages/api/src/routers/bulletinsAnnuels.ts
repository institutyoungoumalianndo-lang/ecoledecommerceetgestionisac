import {
  bulletinAnnuelSchema,
  bulletinIdInputSchema,
  genererBulletinAnnuelInputSchema,
  listBulletinsStudentInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as bulletinAnnuelService from "../services/bulletinAnnuelService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const bulletinsAnnuelsRouter = router({
  listByStudent: permissionProcedure("BULLETINS:LECTURE")
    .input(listBulletinsStudentInputSchema)
    .output(z.array(bulletinAnnuelSchema))
    .query(({ input }) => bulletinAnnuelService.listBulletinsAnnuelsStudent(input.studentId)),

  getById: permissionProcedure("BULLETINS:LECTURE")
    .input(bulletinIdInputSchema)
    .output(bulletinAnnuelSchema)
    .query(({ input }) => bulletinAnnuelService.getBulletinAnnuelById(input.id)),

  generer: permissionProcedure("BULLETINS:CREATION")
    .input(genererBulletinAnnuelInputSchema)
    .output(bulletinAnnuelSchema)
    .mutation(async ({ input, ctx }) => {
      const bulletin = await bulletinAnnuelService.genererBulletinAnnuel(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "BULLETIN_ANNUEL_GENERER",
        module: "BULLETINS",
        entityType: "BulletinAnnuel",
        entityId: bulletin.id,
        result: "SUCCES",
        details: { numeroDossier: bulletin.numeroDossier, moyenne: bulletin.moyenneAnnuelle },
        ipAddress: ctx.ipAddress,
      });
      return bulletin;
    }),

  annuler: permissionProcedure("BULLETINS:ADMINISTRATION")
    .input(bulletinIdInputSchema)
    .output(bulletinAnnuelSchema)
    .mutation(async ({ input, ctx }) => {
      const bulletin = await bulletinAnnuelService.annulerBulletinAnnuel(input.id, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "BULLETIN_ANNUEL_ANNULER",
        module: "BULLETINS",
        entityType: "BulletinAnnuel",
        entityId: bulletin.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return bulletin;
    }),
});
