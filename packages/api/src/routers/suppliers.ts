import { z } from "zod";
import {
  createSupplierInputSchema,
  listSuppliersInputSchema,
  supplierSchema,
  updateSupplierInputSchema,
} from "@isac-erp/shared";
import * as supplierService from "../services/supplierService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const suppliersRouter = router({
  list: permissionProcedure("FOURNISSEURS:LECTURE")
    .input(listSuppliersInputSchema)
    .output(z.array(supplierSchema))
    .query(({ input }) => supplierService.listSuppliers(input)),

  getById: permissionProcedure("FOURNISSEURS:LECTURE")
    .input(z.object({ id: z.string().uuid() }))
    .output(supplierSchema)
    .query(({ input }) => supplierService.getSupplierById(input.id)),

  create: permissionProcedure("FOURNISSEURS:CREATION")
    .input(createSupplierInputSchema)
    .output(supplierSchema)
    .mutation(async ({ input, ctx }) => {
      const supplier = await supplierService.createSupplier(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SUPPLIER_CREATE",
        module: "FOURNISSEURS",
        entityType: "Supplier",
        entityId: supplier.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return supplier;
    }),

  update: permissionProcedure("FOURNISSEURS:MODIFICATION")
    .input(updateSupplierInputSchema)
    .output(supplierSchema)
    .mutation(async ({ input, ctx }) => {
      const supplier = await supplierService.updateSupplier(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SUPPLIER_UPDATE",
        module: "FOURNISSEURS",
        entityType: "Supplier",
        entityId: supplier.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return supplier;
    }),

  deactivate: permissionProcedure("FOURNISSEURS:SUPPRESSION")
    .input(z.object({ id: z.string().uuid() }))
    .output(supplierSchema)
    .mutation(async ({ input, ctx }) => {
      const supplier = await supplierService.deactivateSupplier(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SUPPLIER_DEACTIVATE",
        module: "FOURNISSEURS",
        entityType: "Supplier",
        entityId: supplier.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return supplier;
    }),
});
