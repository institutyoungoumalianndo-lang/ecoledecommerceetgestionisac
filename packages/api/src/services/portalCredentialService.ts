import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CreatePortalCredentialInput,
  CreatePortalCredentialOutput,
  PortalCredentialDto,
  SetPortalCredentialActiveInput,
} from "@isac-erp/shared";
import { generateTemporaryPassword, hashPassword } from "../security/password.js";
import { getSecuritySettings } from "./securitySettingsService.js";
import { emailAdapter } from "./communicationChannels/emailAdapter.js";
import { buildWhatsAppLink } from "./communicationChannels/whatsAppLink.js";

const credentialInclude = {
  student: true,
  guardian: true,
  teacher: true,
} satisfies Prisma.PortalCredentialInclude;

type CredentialWithPrincipal = Prisma.PortalCredentialGetPayload<{ include: typeof credentialInclude }>;

export function resolvePrincipalType(credential: CredentialWithPrincipal): "STUDENT" | "GUARDIAN" | "TEACHER" {
  if (credential.studentId) return "STUDENT";
  if (credential.teacherId) return "TEACHER";
  return "GUARDIAN";
}

export function resolveDisplayName(credential: CredentialWithPrincipal): string {
  if (credential.student) return `${credential.student.firstName} ${credential.student.lastName}`.trim();
  if (credential.teacher) return `${credential.teacher.firstName} ${credential.teacher.lastName}`.trim();
  if (credential.guardian) return `${credential.guardian.firstName} ${credential.guardian.lastName}`.trim();
  return credential.username;
}

function toDto(credential: CredentialWithPrincipal): PortalCredentialDto {
  return {
    id: credential.id,
    principalType: resolvePrincipalType(credential),
    displayName: resolveDisplayName(credential),
    username: credential.username,
    isActive: credential.isActive,
    mustChangePassword: credential.mustChangePassword,
    createdAt: credential.createdAt,
  };
}

const COMBINING_DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

export function slugifyNamePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_PATTERN, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

async function generateUniqueUsername(base: string): Promise<string> {
  const normalizedBase = slugifyNamePart(base) || "portail";
  let candidate = normalizedBase;
  let suffix = 0;
  while (await prisma.portalCredential.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${normalizedBase}${suffix}`;
  }
  return candidate;
}

interface ResolvedPrincipal {
  name: string;
  email: string | null;
  phone: string | null;
  usernameBase: string;
}

async function resolvePrincipal(input: CreatePortalCredentialInput): Promise<ResolvedPrincipal> {
  if (input.studentId) {
    const student = await prisma.student.findUniqueOrThrow({ where: { id: input.studentId } });
    return {
      name: `${student.firstName} ${student.lastName}`.trim(),
      email: student.email,
      phone: student.phonePrimary,
      usernameBase: student.matricule,
    };
  }
  if (input.teacherId) {
    const teacher = await prisma.teacher.findUniqueOrThrow({ where: { id: input.teacherId } });
    return {
      name: `${teacher.firstName} ${teacher.lastName}`.trim(),
      email: teacher.email,
      phone: teacher.phonePrimary,
      usernameBase: teacher.matricule,
    };
  }
  if (input.guardianId) {
    const guardian = await prisma.guardian.findUniqueOrThrow({ where: { id: input.guardianId } });
    return {
      name: `${guardian.firstName} ${guardian.lastName}`.trim(),
      email: guardian.email,
      phone: guardian.phonePrimary,
      usernameBase: `${guardian.firstName}.${guardian.lastName}`,
    };
  }
  throw new Error("Aucun destinataire fourni.");
}

/**
 * Création d'un compte portail (MODULE-15 §2.2) : identifiant + mot de passe temporaire générés,
 * remis via e-mail (envoi direct) ou WhatsApp (lien "cliquer pour envoyer" — même contrainte que
 * `digitalDocumentShareService.ts`, aucune API officielle disponible). `mustChangePassword` force le
 * changement de mot de passe dès la première connexion (voir `portalAuthService.ts`).
 */
export async function createPortalCredential(
  input: CreatePortalCredentialInput,
  actorUserId: string
): Promise<CreatePortalCredentialOutput> {
  const principal = await resolvePrincipal(input);
  const settings = await getSecuritySettings();
  const username = await generateUniqueUsername(principal.usernameBase);
  const temporaryPassword = generateTemporaryPassword(settings);
  const passwordHash = await hashPassword(temporaryPassword);

  const messageBody = `Bonjour ${principal.name},\n\nVotre accès au portail web a été créé.\nIdentifiant : ${username}\nMot de passe temporaire : ${temporaryPassword}\n\nCe mot de passe devra être changé dès la première connexion.`;

  let whatsappLink: string | null = null;
  if (input.channel === "EMAIL") {
    if (!principal.email) {
      throw new Error(`${principal.name} n'a pas d'adresse e-mail enregistrée.`);
    }
    const result = await emailAdapter.send({
      to: principal.email,
      subject: "Vos identifiants du portail web",
      content: messageBody,
    });
    if (!result.success) {
      throw new Error(result.error ?? "Échec de l'envoi de l'e-mail.");
    }
  } else {
    if (!principal.phone) {
      throw new Error(`${principal.name} n'a pas de numéro de téléphone enregistré.`);
    }
    whatsappLink = buildWhatsAppLink(principal.phone, messageBody);
  }

  const credential = await prisma.portalCredential.create({
    data: {
      studentId: input.studentId ?? null,
      guardianId: input.guardianId ?? null,
      teacherId: input.teacherId ?? null,
      username,
      passwordHash,
      mustChangePassword: true,
      createdBy: actorUserId,
    },
    include: credentialInclude,
  });

  return { credential: toDto(credential), whatsappLink };
}

export async function listPortalCredentials(): Promise<PortalCredentialDto[]> {
  const rows = await prisma.portalCredential.findMany({
    include: credentialInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}

export async function setPortalCredentialActive(input: SetPortalCredentialActiveInput): Promise<PortalCredentialDto> {
  const credential = await prisma.portalCredential.update({
    where: { id: input.id },
    data: { isActive: input.isActive },
    include: credentialInclude,
  });
  return toDto(credential);
}
