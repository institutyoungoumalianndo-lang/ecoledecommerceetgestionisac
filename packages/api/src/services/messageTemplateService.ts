import { prisma } from "@isac-erp/db";
import type { CreateMessageTemplateInput, ListMessageTemplatesInput, MessageTemplateDto, UpdateMessageTemplateInput } from "@isac-erp/shared";

/**
 * Substitution de variables {Nom}/{Montant}/... (voir MODULE-12 §1.9) — fonction pure, testable
 * indépendamment. Aucune logique conditionnelle dans le gabarit lui-même : une variable absente du
 * jeu fourni est laissée telle quelle (ex. {SoldeMessage} pré-calculé par l'appelant, voir §1.11).
 */
export function substituteTemplateVariables(content: string, variables: Record<string, string>): string {
  return content.replace(/\{([^{}]+)\}/g, (match, key: string) => (key in variables ? variables[key]! : match));
}

/** Référentiel configurable, jamais codé en dur (voir MODULE-12 §1.8). */
export async function listMessageTemplates(input: ListMessageTemplatesInput): Promise<MessageTemplateDto[]> {
  return prisma.messageTemplate.findMany({
    where: input.activeOnly ? { isActive: true } : undefined,
    orderBy: { label: "asc" },
  });
}

export async function createMessageTemplate(input: CreateMessageTemplateInput): Promise<MessageTemplateDto> {
  return prisma.messageTemplate.create({ data: input });
}

export async function updateMessageTemplate(input: UpdateMessageTemplateInput): Promise<MessageTemplateDto> {
  return prisma.messageTemplate.update({
    where: { id: input.id },
    data: { label: input.label, content: input.content, isActive: input.isActive },
  });
}

/** Jamais supprimé physiquement si `isSystem` (voir MODULE-12 §3 règle 3) — désactivation seulement. */
export async function deleteMessageTemplate(id: string): Promise<void> {
  const template = await prisma.messageTemplate.findUniqueOrThrow({ where: { id } });
  if (template.isSystem) {
    throw new Error("Ce modèle système ne peut pas être supprimé — désactivez-le si besoin.");
  }
  await prisma.messageTemplate.delete({ where: { id } });
}
