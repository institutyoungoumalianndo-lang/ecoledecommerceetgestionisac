import { prisma } from "@isac-erp/db";
import type { CreatePaymentMethodInput, PaymentMethodDto, UpdatePaymentMethodInput } from "@isac-erp/shared";

export async function listPaymentMethods(): Promise<PaymentMethodDto[]> {
  return prisma.paymentMethod.findMany({ orderBy: { label: "asc" } });
}

export async function createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethodDto> {
  return prisma.paymentMethod.create({ data: { ...input, isSystem: false } });
}

/** Le label peut être modifié même sur un mode système ; isSystem empêche seulement la suppression (voir MODULE-04.3 §1.3). */
export async function updatePaymentMethod(input: UpdatePaymentMethodInput): Promise<PaymentMethodDto> {
  const { id, ...fields } = input;
  return prisma.paymentMethod.update({ where: { id }, data: fields });
}

export async function deactivatePaymentMethod(id: string): Promise<PaymentMethodDto> {
  const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { id } });
  if (method.isSystem) {
    throw new Error("Un mode de paiement système ne peut pas être désactivé, seulement les modes personnalisés.");
  }
  return prisma.paymentMethod.update({ where: { id }, data: { isActive: false } });
}

export async function reactivatePaymentMethod(id: string): Promise<PaymentMethodDto> {
  return prisma.paymentMethod.update({ where: { id }, data: { isActive: true } });
}
