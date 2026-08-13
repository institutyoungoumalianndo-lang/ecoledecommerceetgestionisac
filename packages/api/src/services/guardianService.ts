import { prisma } from "@isac-erp/db";
import type {
  GuardianDto,
  LinkGuardianInput,
  SetPrimaryContactInput,
  StudentGuardianDto,
  UpdateGuardianInput,
} from "@isac-erp/shared";

export async function searchGuardians(search: string): Promise<GuardianDto[]> {
  return prisma.guardian.findMany({
    where: {
      OR: [
        { lastName: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { phonePrimary: { contains: search, mode: "insensitive" } },
      ],
    },
    take: 10,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function listStudentGuardians(studentId: string): Promise<StudentGuardianDto[]> {
  return prisma.studentGuardian.findMany({
    where: { studentId },
    include: { guardian: true },
    orderBy: { isPrimaryContact: "desc" },
  });
}

export async function updateGuardian(input: UpdateGuardianInput): Promise<GuardianDto> {
  const { id, ...fields } = input;
  return prisma.guardian.update({
    where: { id },
    data: { ...fields, email: fields.email === "" ? null : fields.email },
  });
}

/**
 * Lie un responsable (existant ou nouveau) à un étudiant. Un seul contact
 * officiel par étudiant (MODULE-04 §2.4) : désigner un nouveau contact
 * officiel désactive automatiquement l'ancien, dans la même transaction.
 */
export async function linkGuardian(input: LinkGuardianInput): Promise<StudentGuardianDto> {
  return prisma.$transaction(async (tx) => {
    const guardianId = input.guardianId
      ? input.guardianId
      : (
          await tx.guardian.create({
            data: {
              ...input.newGuardian!,
              email: input.newGuardian!.email || null,
            },
          })
        ).id;

    if (input.isPrimaryContact) {
      await tx.studentGuardian.updateMany({
        where: { studentId: input.studentId, isPrimaryContact: true },
        data: { isPrimaryContact: false },
      });
    }

    return tx.studentGuardian.create({
      data: {
        studentId: input.studentId,
        guardianId,
        relationship: input.relationship,
        relationshipOther: input.relationshipOther ?? null,
        isPrimaryContact: input.isPrimaryContact,
      },
      include: { guardian: true },
    });
  });
}

export async function unlinkGuardian(studentGuardianId: string): Promise<void> {
  await prisma.studentGuardian.delete({ where: { id: studentGuardianId } });
}

export async function setPrimaryContact(input: SetPrimaryContactInput): Promise<StudentGuardianDto> {
  return prisma.$transaction(async (tx) => {
    await tx.studentGuardian.updateMany({
      where: { studentId: input.studentId, isPrimaryContact: true },
      data: { isPrimaryContact: false },
    });
    return tx.studentGuardian.update({
      where: { id: input.studentGuardianId },
      data: { isPrimaryContact: true },
      include: { guardian: true },
    });
  });
}
