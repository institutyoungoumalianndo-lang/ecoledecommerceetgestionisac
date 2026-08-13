import {
  bulletinIdInputSchema,
  bulletinPeriodeSchema,
  genererBulletinPeriodeInputSchema,
  listBulletinsStudentInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as bulletinPeriodeService from "../services/bulletinPeriodeService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const bulletinsPeriodeRouter = router({
  listByStudent: permissionProcedure("BULLETINS:LECTURE")
    .input(listBulletinsStudentInputSchema)
    .output(z.array(bulletinPeriodeSchema))
    .query(({ input }) => bulletinPeriodeService.listBulletinsPeriodeStudent(input.studentId)),

  getById: permissionProcedure("BULLETINS:LECTURE")
    .input(bulletinIdInputSchema)
    .output(bulletinPeriodeSchema)
    .query(({ input }) => bulletinPeriodeService.getBulletinPeriodeById(input.id)),

  generer: permissionProcedure("BULLETINS:CREATION")
    .input(genererBulletinPeriodeInputSchema)
    .output(bulletinPeriodeSchema)
    .mutation(async ({ input, ctx }) => {
      const bulletin = await bulletinPeriodeService.genererBulletinPeriode(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "BULLETIN_PERIODE_GENERER",
        module: "BULLETINS",
        entityType: "BulletinPeriode",
        entityId: bulletin.id,
        result: "SUCCES",
        details: { numeroDossier: bulletin.numeroDossier, moyenne: bulletin.moyenne },
        ipAddress: ctx.ipAddress,
      });
      return bulletin;
    }),

  annuler: permissionProcedure("BULLETINS:ADMINISTRATION")
    .input(bulletinIdInputSchema)
    .output(bulletinPeriodeSchema)
    .mutation(async ({ input, ctx }) => {
      const bulletin = await bulletinPeriodeService.annulerBulletinPeriode(input.id, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "BULLETIN_PERIODE_ANNULER",
        module: "BULLETINS",
        entityType: "BulletinPeriode",
        entityId: bulletin.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return bulletin;
    }),
});
