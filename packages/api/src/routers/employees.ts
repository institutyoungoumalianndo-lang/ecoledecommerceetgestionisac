import {
  archiveEmployeeInputSchema,
  createEmployeeInputSchema,
  employeeIdInputSchema,
  employeeListFilterInputSchema,
  employeeListPageSchema,
  employeeListRowSchema,
  employeeSchema,
  listTeachersPayrollStatusInputSchema,
  teacherPayrollStatusSchema,
  updateEmployeeInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as employeeService from "../services/employeeService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const employeesRouter = router({
  list: permissionProcedure("PAIE_EMPLOYES:LECTURE")
    .input(employeeListFilterInputSchema)
    .output(employeeListPageSchema)
    .query(({ input }) => employeeService.listEmployees(input)),

  listForExport: permissionProcedure("PAIE_EMPLOYES:EXPORT")
    .input(employeeListFilterInputSchema.omit({ page: true, pageSize: true }))
    .output(z.array(employeeListRowSchema))
    .query(({ input }) => employeeService.listEmployeesForExport(input)),

  getById: permissionProcedure("PAIE_EMPLOYES:LECTURE")
    .input(employeeIdInputSchema)
    .output(employeeSchema)
    .query(({ input }) => employeeService.getEmployeeById(input.id)),

  create: permissionProcedure("PAIE_EMPLOYES:CREATION")
    .input(createEmployeeInputSchema)
    .output(employeeSchema)
    .mutation(async ({ input, ctx }) => {
      const employee = await employeeService.createEmployee(input);
      await logAction({
        userId: ctx.session.userId,
        action: "EMPLOYEE_CREATE",
        module: "PAIE_EMPLOYES",
        entityType: "Employee",
        entityId: employee.id,
        result: "SUCCES",
        details: { matricule: employee.matricule },
        ipAddress: ctx.ipAddress,
      });
      return employee;
    }),

  update: permissionProcedure("PAIE_EMPLOYES:MODIFICATION")
    .input(updateEmployeeInputSchema)
    .output(employeeSchema)
    .mutation(async ({ input, ctx }) => {
      const employee = await employeeService.updateEmployee(input);
      await logAction({
        userId: ctx.session.userId,
        action: "EMPLOYEE_UPDATE",
        module: "PAIE_EMPLOYES",
        entityType: "Employee",
        entityId: employee.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return employee;
    }),

  archive: permissionProcedure("PAIE_EMPLOYES:SUPPRESSION")
    .input(archiveEmployeeInputSchema)
    .output(employeeSchema)
    .mutation(async ({ input, ctx }) => {
      const employee = await employeeService.archiveEmployee(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "EMPLOYEE_ARCHIVE",
        module: "PAIE_EMPLOYES",
        entityType: "Employee",
        entityId: employee.id,
        result: "SUCCES",
        details: { reason: input.reason },
        ipAddress: ctx.ipAddress,
      });
      return employee;
    }),

  restore: permissionProcedure("PAIE_EMPLOYES:SUPPRESSION")
    .input(employeeIdInputSchema)
    .output(employeeSchema)
    .mutation(async ({ input, ctx }) => {
      const employee = await employeeService.restoreEmployee(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "EMPLOYEE_RESTORE",
        module: "PAIE_EMPLOYES",
        entityType: "Employee",
        entityId: employee.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return employee;
    }),

  listTeachersPayrollStatus: permissionProcedure("PAIE_EMPLOYES:LECTURE")
    .input(listTeachersPayrollStatusInputSchema)
    .output(z.array(teacherPayrollStatusSchema))
    .query(({ input }) => employeeService.listTeachersPayrollStatus(input)),
});
