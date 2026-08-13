import path from "node:path";
import { prisma, type Prisma } from "@isac-erp/db";
import type { DigitalDocumentShareDto, ShareDigitalDocumentInput, ShareDigitalDocumentOutput } from "@isac-erp/shared";
import { emailAdapter } from "./communicationChannels/emailAdapter.js";
import { buildWhatsAppLink } from "./communicationChannels/whatsAppLink.js";
import { UPLOADS_DIR } from "../uploads/storage.js";

const shareInclude = {
  recipientStudent: true,
  recipientTeacher: true,
  recipientEmployee: { include: { teacher: true } },
  sharedByUser: true,
} satisfies Prisma.DigitalDocumentShareInclude;

type ShareWithRelations = Prisma.DigitalDocumentShareGetPayload<{ include: typeof shareInclude }>;

export function resolveRecipientName(share: ShareWithRelations): string | null {
  if (share.recipientStudent) {
    return `${share.recipientStudent.firstName} ${share.recipientStudent.lastName}`.trim() || null;
  }
  if (share.recipientEmployee) {
    const source = share.recipientEmployee.teacher ?? share.recipientEmployee;
    return `${source.firstName ?? ""} ${source.lastName ?? ""}`.trim() || null;
  }
  if (share.recipientTeacher) {
    return `${share.recipientTeacher.firstName} ${share.recipientTeacher.lastName}`.trim() || null;
  }
  return null;
}

function toShareDto(share: ShareWithRelations): DigitalDocumentShareDto {
  return {
    id: share.id,
    channel: share.channel,
    recipientName: resolveRecipientName(share),
    sharedByName: share.sharedByUser ? `${share.sharedByUser.firstName} ${share.sharedByUser.lastName}` : null,
    sharedAt: share.sharedAt,
  };
}

async function resolveRecipientContact(
  input: ShareDigitalDocumentInput
): Promise<{ name: string; email: string | null; phone: string | null }> {
  if (input.recipientStudentId) {
    const student = await prisma.student.findUniqueOrThrow({ where: { id: input.recipientStudentId } });
    return { name: `${student.firstName} ${student.lastName}`.trim(), email: student.email, phone: student.phonePrimary };
  }
  if (input.recipientTeacherId) {
    const teacher = await prisma.teacher.findUniqueOrThrow({ where: { id: input.recipientTeacherId } });
    return { name: `${teacher.firstName} ${teacher.lastName}`.trim(), email: teacher.email, phone: teacher.phonePrimary };
  }
  if (input.recipientEmployeeId) {
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: input.recipientEmployeeId },
      include: { teacher: true },
    });
    const source = employee.teacher ?? employee;
    return {
      name: `${source.firstName ?? ""} ${source.lastName ?? ""}`.trim(),
      email: source.email,
      phone: source.phonePrimary,
    };
  }
  throw new Error("Aucun destinataire fourni.");
}

/**
 * Partage d'un document numérique (MODULE-13 §5.2/§5.3) :
 * - E-mail : pièce jointe réelle, envoyée immédiatement (nodemailer supporte les pièces jointes
 *   nativement, voir emailAdapter.ts).
 * - WhatsApp : jamais de pièce jointe réelle ni de lien de téléchargement fiable — l'API local de
 *   l'application (`http://localhost:<port>/uploads/...`) n'est reachable que depuis le poste qui
 *   l'héberge, jamais depuis le téléphone du destinataire. Un lien wa.me pré-rempli invite donc
 *   simplement le membre du personnel à joindre le fichier lui-même dans WhatsApp (il l'a déjà en
 *   local) — même contrainte que le canal WhatsApp du Module 12 (aucune API officielle disponible).
 */
export async function shareDigitalDocument(
  input: ShareDigitalDocumentInput,
  actorUserId: string
): Promise<ShareDigitalDocumentOutput> {
  const document = await prisma.digitalDocument.findUniqueOrThrow({ where: { id: input.documentId } });
  const recipient = await resolveRecipientContact(input);

  let whatsappLink: string | null = null;

  if (input.channel === "EMAIL") {
    if (!recipient.email) {
      throw new Error(`${recipient.name} n'a pas d'adresse e-mail enregistrée.`);
    }
    const absolutePath = path.join(UPLOADS_DIR, document.filePath.replace(/^\/uploads\//, ""));
    const result = await emailAdapter.send({
      to: recipient.email,
      subject: `Document partagé — ${document.title}`,
      content: `Bonjour,\n\nVeuillez trouver ci-joint le document "${document.title}".\n\nCordialement.`,
      attachments: [{ filename: path.basename(document.filePath), path: absolutePath }],
    });
    if (!result.success) {
      throw new Error(result.error ?? "Échec de l'envoi de l'e-mail.");
    }
  } else {
    if (!recipient.phone) {
      throw new Error(`${recipient.name} n'a pas de numéro de téléphone enregistré.`);
    }
    whatsappLink = buildWhatsAppLink(
      recipient.phone,
      `Bonjour, voici le document "${document.title}" — je vous le joins directement dans ce message.`
    );
  }

  const share = await prisma.digitalDocumentShare.create({
    data: {
      documentId: input.documentId,
      recipientStudentId: input.recipientStudentId ?? null,
      recipientTeacherId: input.recipientTeacherId ?? null,
      recipientEmployeeId: input.recipientEmployeeId ?? null,
      channel: input.channel,
      sharedBy: actorUserId,
    },
    include: shareInclude,
  });

  return { share: toShareDto(share), whatsappLink };
}

export async function listDigitalDocumentShares(documentId: string): Promise<DigitalDocumentShareDto[]> {
  const shares = await prisma.digitalDocumentShare.findMany({
    where: { documentId },
    include: shareInclude,
    orderBy: { sharedAt: "desc" },
  });
  return shares.map(toShareDto);
}
