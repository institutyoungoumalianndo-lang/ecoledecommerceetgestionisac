import { prisma, type Prisma } from "@isac-erp/db";
import type { CreateSupplierInput, ListSuppliersInput, SupplierDto, UpdateSupplierInput } from "@isac-erp/shared";

async function toDto(row: {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  category: string | null;
  isActive: boolean;
}): Promise<SupplierDto> {
  const paid = await prisma.expense.aggregate({
    where: { supplierId: row.id, status: "APPROUVEE" },
    _sum: { amount: true },
  });
  return { ...row, totalPaid: Number(paid._sum.amount ?? 0) };
}

export async function listSuppliers(filter: ListSuppliersInput): Promise<SupplierDto[]> {
  const where: Prisma.SupplierWhereInput = {
    isActive: filter.includeInactive ? undefined : true,
    OR: filter.search
      ? [
          { name: { contains: filter.search, mode: "insensitive" } },
          { code: { contains: filter.search, mode: "insensitive" } },
        ]
      : undefined,
  };
  const rows = await prisma.supplier.findMany({ where, orderBy: { name: "asc" } });
  return Promise.all(rows.map(toDto));
}

export async function getSupplierById(id: string): Promise<SupplierDto> {
  const row = await prisma.supplier.findUniqueOrThrow({ where: { id } });
  return toDto(row);
}

export async function createSupplier(input: CreateSupplierInput): Promise<SupplierDto> {
  const row = await prisma.supplier.create({
    data: {
      code: input.code,
      name: input.name,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      contactPerson: input.contactPerson ?? null,
      category: input.category ?? null,
    },
  });
  return toDto(row);
}

export async function updateSupplier(input: UpdateSupplierInput): Promise<SupplierDto> {
  const { id, ...fields } = input;
  const row = await prisma.supplier.update({ where: { id }, data: fields });
  return toDto(row);
}

export async function deactivateSupplier(id: string): Promise<SupplierDto> {
  const row = await prisma.supplier.update({ where: { id }, data: { isActive: false } });
  return toDto(row);
}
