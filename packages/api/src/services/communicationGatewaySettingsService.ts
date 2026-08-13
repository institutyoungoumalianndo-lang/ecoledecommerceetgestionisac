import { prisma } from "@isac-erp/db";
import type {
  CommunicationSettingsDto,
  CreateSmsGatewayAccountInput,
  EmailGatewaySettingsDto,
  SmsGatewayAccountDto,
  TestGatewayResult,
  UpdateCommunicationSettingsInput,
  UpdateEmailGatewaySettingsInput,
  UpdateSmsGatewayAccountInput,
  UpdateWhatsAppGatewaySettingsInput,
  WhatsAppGatewaySettingsDto,
} from "@isac-erp/shared";
import { emailAdapter } from "./communicationChannels/emailAdapter.js";
import { smsAdapter } from "./communicationChannels/smsAdapter.js";

function toSmsDto(row: {
  id: string;
  providerName: string;
  label: string;
  apiIdentifier: string | null;
  apiKey: string | null;
  senderId: string | null;
  officialPhoneNumber: string | null;
  balance: unknown;
  isDefault: boolean;
  isActive: boolean;
  connectionStatus: SmsGatewayAccountDto["connectionStatus"];
  lastTestedAt: Date | null;
}): SmsGatewayAccountDto {
  return {
    id: row.id,
    providerName: row.providerName,
    label: row.label,
    apiIdentifier: row.apiIdentifier,
    hasApiKey: Boolean(row.apiKey),
    senderId: row.senderId,
    officialPhoneNumber: row.officialPhoneNumber,
    balance: row.balance !== null ? Number(row.balance) : null,
    isDefault: row.isDefault,
    isActive: row.isActive,
    connectionStatus: row.connectionStatus,
    lastTestedAt: row.lastTestedAt,
  };
}

export async function listSmsGatewayAccounts(): Promise<SmsGatewayAccountDto[]> {
  const rows = await prisma.smsGatewayAccount.findMany({ orderBy: { label: "asc" } });
  return rows.map(toSmsDto);
}

/** Un seul compte peut être `isDefault` à la fois — le tout premier compte créé le devient automatiquement. */
export async function createSmsGatewayAccount(input: CreateSmsGatewayAccountInput): Promise<SmsGatewayAccountDto> {
  const existingCount = await prisma.smsGatewayAccount.count();
  const row = await prisma.smsGatewayAccount.create({
    data: {
      providerName: input.providerName,
      label: input.label,
      apiIdentifier: input.apiIdentifier ?? null,
      apiKey: input.apiKey ?? null,
      senderId: input.senderId ?? null,
      officialPhoneNumber: input.officialPhoneNumber ?? null,
      balance: input.balance ?? null,
      isDefault: existingCount === 0,
    },
  });
  return toSmsDto(row);
}

export async function updateSmsGatewayAccount(input: UpdateSmsGatewayAccountInput): Promise<SmsGatewayAccountDto> {
  const row = await prisma.smsGatewayAccount.update({
    where: { id: input.id },
    data: {
      providerName: input.providerName,
      label: input.label,
      apiIdentifier: input.apiIdentifier,
      apiKey: input.apiKey,
      senderId: input.senderId,
      officialPhoneNumber: input.officialPhoneNumber,
      balance: input.balance,
      isActive: input.isActive,
    },
  });
  return toSmsDto(row);
}

/** Bascule transactionnelle — un seul compte `isDefault` à la fois (voir MODULE-12 §3 règle 4). */
export async function setDefaultSmsGatewayAccount(id: string): Promise<SmsGatewayAccountDto> {
  const row = await prisma.$transaction(async (tx) => {
    await tx.smsGatewayAccount.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    return tx.smsGatewayAccount.update({ where: { id }, data: { isDefault: true } });
  });
  return toSmsDto(row);
}

export async function deleteSmsGatewayAccount(id: string): Promise<void> {
  await prisma.smsGatewayAccount.delete({ where: { id } });
}

export async function testSmsGatewayAccount(id: string): Promise<TestGatewayResult> {
  const result = await smsAdapter.testConnection();
  await prisma.smsGatewayAccount.update({
    where: { id },
    data: { connectionStatus: result.success ? "CONNECTE" : "DECONNECTE", lastTestedAt: new Date() },
  });
  return result;
}

function toWhatsAppDto(row: {
  id: string;
  businessPhoneNumber: string | null;
  connectionStatus: WhatsAppGatewaySettingsDto["connectionStatus"];
  lastTestedAt: Date | null;
}): WhatsAppGatewaySettingsDto {
  return {
    id: row.id,
    businessPhoneNumber: row.businessPhoneNumber,
    connectionStatus: row.connectionStatus,
    lastTestedAt: row.lastTestedAt,
  };
}

async function getOrCreateWhatsAppSettings() {
  const existing = await prisma.whatsAppGatewaySettings.findFirst();
  if (existing) return existing;
  return prisma.whatsAppGatewaySettings.create({ data: {} });
}

export async function getWhatsAppGatewaySettings(): Promise<WhatsAppGatewaySettingsDto> {
  return toWhatsAppDto(await getOrCreateWhatsAppSettings());
}

export async function updateWhatsAppGatewaySettings(
  input: UpdateWhatsAppGatewaySettingsInput
): Promise<WhatsAppGatewaySettingsDto> {
  const existing = await getOrCreateWhatsAppSettings();
  const row = await prisma.whatsAppGatewaySettings.update({
    where: { id: existing.id },
    data: { businessPhoneNumber: input.businessPhoneNumber },
  });
  return toWhatsAppDto(row);
}

function toEmailDto(row: {
  id: string;
  officialEmail: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPassword: string | null;
  useTls: boolean;
  connectionStatus: EmailGatewaySettingsDto["connectionStatus"];
  lastTestedAt: Date | null;
}): EmailGatewaySettingsDto {
  return {
    id: row.id,
    officialEmail: row.officialEmail,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUsername: row.smtpUsername,
    hasSmtpPassword: Boolean(row.smtpPassword),
    useTls: row.useTls,
    connectionStatus: row.connectionStatus,
    lastTestedAt: row.lastTestedAt,
  };
}

async function getOrCreateEmailSettings() {
  const existing = await prisma.emailGatewaySettings.findFirst();
  if (existing) return existing;
  return prisma.emailGatewaySettings.create({ data: {} });
}

export async function getEmailGatewaySettings(): Promise<EmailGatewaySettingsDto> {
  return toEmailDto(await getOrCreateEmailSettings());
}

export async function updateEmailGatewaySettings(
  input: UpdateEmailGatewaySettingsInput
): Promise<EmailGatewaySettingsDto> {
  const existing = await getOrCreateEmailSettings();
  const row = await prisma.emailGatewaySettings.update({
    where: { id: existing.id },
    data: {
      officialEmail: input.officialEmail,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpUsername: input.smtpUsername,
      smtpPassword: input.smtpPassword,
      useTls: input.useTls,
    },
  });
  return toEmailDto(row);
}

export async function testEmailGatewaySettings(): Promise<TestGatewayResult> {
  const result = await emailAdapter.testConnection();
  const existing = await getOrCreateEmailSettings();
  await prisma.emailGatewaySettings.update({
    where: { id: existing.id },
    data: { connectionStatus: result.success ? "CONNECTE" : "DECONNECTE", lastTestedAt: new Date() },
  });
  return result;
}

async function getOrCreateCommunicationSettings() {
  const existing = await prisma.communicationSettings.findFirst();
  if (existing) return existing;
  return prisma.communicationSettings.create({ data: {} });
}

export async function getCommunicationSettings(): Promise<CommunicationSettingsDto> {
  return getOrCreateCommunicationSettings();
}

export async function updateCommunicationSettings(
  input: UpdateCommunicationSettingsInput
): Promise<CommunicationSettingsDto> {
  const existing = await getOrCreateCommunicationSettings();
  return prisma.communicationSettings.update({
    where: { id: existing.id },
    data: { emailSignature: input.emailSignature, messageFooter: input.messageFooter },
  });
}
