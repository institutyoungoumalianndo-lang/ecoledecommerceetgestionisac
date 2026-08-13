import { randomInt } from "node:crypto";
import { prisma } from "@isac-erp/db";
import type { ActivationKeyDto, GenerateActivationKeysInput } from "@isac-erp/shared";
import { SUPER_ADMIN_ROLE_CODE } from "@isac-erp/shared";

/**
 * Clé d'activation d'installation (2026-08-10, retour du porteur du projet, ADR-054) — gestion du
 * "stock" de clés par le Super Administrateur. La consommation d'une clé (création du compte) vit
 * dans `authService.redeemActivationKey`, pas ici : ce fichier ne gère que le cycle de vie de la clé
 * elle-même (génération, liste, révocation), jamais la création de session.
 */

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclut 0/O/1/I — ambigus à la saisie manuelle
const CODE_GROUP_LENGTH = 4;
const CODE_GROUP_COUNT = 3;

function generateCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < CODE_GROUP_COUNT; g++) {
    let group = "";
    for (let i = 0; i < CODE_GROUP_LENGTH; i++) {
      group += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join("-");
}

function assertSuperAdmin(roleCode: string | undefined): void {
  if (roleCode !== SUPER_ADMIN_ROLE_CODE) {
    throw new Error("Action réservée au Super Administrateur.");
  }
}

function toDto(key: {
  id: string;
  code: string;
  status: "UNUSED" | "USED";
  roleId: string;
  role: { label: string };
  createdAt: Date;
  usedAt: Date | null;
  usedByUser: { firstName: string; lastName: string } | null;
}): ActivationKeyDto {
  return {
    id: key.id,
    code: key.code,
    status: key.status,
    roleId: key.roleId,
    roleLabel: key.role.label,
    createdAt: key.createdAt,
    usedAt: key.usedAt,
    usedByName: key.usedByUser ? `${key.usedByUser.firstName} ${key.usedByUser.lastName}` : null,
  };
}

export async function generateActivationKeys(
  input: GenerateActivationKeysInput,
  actorUserId: string,
  actorRoleCode: string | undefined
): Promise<ActivationKeyDto[]> {
  assertSuperAdmin(actorRoleCode);

  const created: ActivationKeyDto[] = [];
  for (let i = 0; i < input.count; i++) {
    // Boucle de nouvelle tentative en cas de collision (improbable vu l'alphabet/longueur, mais la
    // contrainte unique existe précisément pour ce cas) plutôt que de faire confiance à la seule
    // probabilité.
    let key: Awaited<ReturnType<typeof prisma.activationKey.create>> | null = null;
    while (!key) {
      try {
        key = await prisma.activationKey.create({
          data: { code: generateCode(), roleId: input.roleId, createdBy: actorUserId },
        });
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("Unique constraint")) throw error;
      }
    }
    const withRelations = await prisma.activationKey.findUniqueOrThrow({
      where: { id: key.id },
      include: { role: { select: { label: true } }, usedByUser: { select: { firstName: true, lastName: true } } },
    });
    created.push(toDto(withRelations));
  }
  return created;
}

export async function listActivationKeys(actorRoleCode: string | undefined): Promise<ActivationKeyDto[]> {
  assertSuperAdmin(actorRoleCode);
  const keys = await prisma.activationKey.findMany({
    include: { role: { select: { label: true } }, usedByUser: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return keys.map(toDto);
}

export async function revokeActivationKey(id: string, actorRoleCode: string | undefined): Promise<void> {
  assertSuperAdmin(actorRoleCode);
  const key = await prisma.activationKey.findUniqueOrThrow({ where: { id } });
  if (key.status !== "UNUSED") {
    throw new Error("Seule une clé non utilisée peut être révoquée.");
  }
  await prisma.activationKey.delete({ where: { id } });
}
