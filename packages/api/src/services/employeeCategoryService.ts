import { prisma } from "@isac-erp/db";
import type {
  CreateEmployeeCategoryInput,
  EmployeeCategoryDto,
  UpdateEmployeeCategoryInput,
} from "@isac-erp/shared";

export async function listEmployeeCategories(): Promise<EmployeeCategoryDto[]> {
  return prisma.employeeCategory.findMany({ orderBy: { label: "asc" } });
}

export async function createEmployeeCategory(input: CreateEmployeeCategoryInput): Promise<EmployeeCategoryDto> {
  return prisma.employeeCategory.create({ data: input });
}

export async function updateEmployeeCategory(input: UpdateEmployeeCategoryInput): Promise<EmployeeCategoryDto> {
  const { id, ...fields } = input;
  return prisma.employeeCategory.update({ where: { id }, data: fields });
}

export async function deactivateEmployeeCategory(id: string): Promise<EmployeeCategoryDto> {
  return prisma.employeeCategory.update({ where: { id }, data: { isActive: false } });
}

export async function reactivateEmployeeCategory(id: string): Promise<EmployeeCategoryDto> {
  return prisma.employeeCategory.update({ where: { id }, data: { isActive: true } });
}
