import { z } from "zod";
import { cashRegisterSchema, createCashRegisterInputSchema, updateCashRegisterInputSchema } from "@isac-erp/shared";
import * as cashRegisterService from "../services/cashRegisterService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const cashRegistersRouter = router({
  list: permissionProcedure("CAISSE:LECTURE")
    .output(z.array(cashRegisterSchema))
    .query(() => cashRegisterService.listCashRegisters()),

  create: permissionProcedure("CAISSE:ADMINISTRATION")
    .input(createCashRegisterInputSchema)
    .output(cashRegisterSchema)
    .mutation(async ({ input, ctx }) => {
      const register = await cashRegisterService.createCashRegister(input);
      await logAction({
        userId: ctx.session.userId,
        action: "CASH_REGISTER_CREATE",
        module: "CAISSE",
        entityType: "CashRegister",
        entityId: register.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return register;
    }),

  update: permissionProcedure("CAISSE:ADMINISTRATION")
    .input(updateCashRegisterInputSchema)
    .output(cashRegisterSchema)
    .mutation(async ({ input, ctx }) => {
      const register = await cashRegisterService.updateCashRegister(input);
      await logAction({
        userId: ctx.session.userId,
        action: "CASH_REGISTER_UPDATE",
        module: "CAISSE",
        entityType: "CashRegister",
        entityId: register.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return register;
    }),
});
