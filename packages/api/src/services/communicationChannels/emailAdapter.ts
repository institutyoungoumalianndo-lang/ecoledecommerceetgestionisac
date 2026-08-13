import { createTransport } from "nodemailer";
import { prisma } from "@isac-erp/db";
import type { ChannelAdapter, ChannelSendInput, ChannelSendResult, ChannelTestResult } from "./types.js";

/** Canal E-mail — SMTP standard, aucun fournisseur propriétaire (voir MODULE-12 §1.1/§1.12). */
async function buildTransport() {
  const settings = await prisma.emailGatewaySettings.findFirst();
  if (!settings?.smtpHost || !settings.smtpPort || !settings.smtpUsername || !settings.smtpPassword) {
    return null;
  }
  const transport = createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.useTls,
    auth: { user: settings.smtpUsername, pass: settings.smtpPassword },
  });
  return { transport, from: settings.officialEmail ?? settings.smtpUsername };
}

export const emailAdapter: ChannelAdapter = {
  async send({ to, content, subject, attachments }: ChannelSendInput): Promise<ChannelSendResult> {
    const built = await buildTransport();
    if (!built) return { success: false, error: "Passerelle e-mail non configurée" };
    try {
      const info = await built.transport.sendMail({
        from: built.from,
        to,
        subject: subject ?? "ISAC ERP — Notification",
        text: content,
        attachments,
      });
      return { success: true, providerMessageId: info.messageId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erreur d'envoi e-mail" };
    }
  },

  async testConnection(): Promise<ChannelTestResult> {
    const built = await buildTransport();
    if (!built) return { success: false, message: "Passerelle e-mail non configurée" };
    try {
      await built.transport.verify();
      return { success: true, message: "Connexion SMTP réussie." };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Échec de connexion SMTP" };
    }
  },
};
