import { prisma } from "@isac-erp/db";
import type { ChannelAdapter, ChannelSendInput, ChannelSendResult, ChannelTestResult } from "./types.js";

/**
 * Canal SMS — passerelle locale (téléphone Android dédié, voir MODULE-12 §6.1), pas d'API cloud.
 * Cible l'API HTTP exposée par une application de passerelle SMS Android tierce et open source
 * (type "SMS Gateway for Android"), installée et maintenue par le porteur du projet, hors du
 * périmètre de ce code. `apiIdentifier` porte l'URL de base du téléphone sur le réseau local
 * (ex. http://192.168.1.50:8080), `apiKey` l'en-tête d'autorisation complet attendu par l'application
 * (ex. "Basic xxxx") — configurable sans toucher au code, cohérent avec l'architecture indépendante
 * des fournisseurs (§1.1). Utilise toujours le compte marqué `isDefault`.
 */
async function getDefaultAccount() {
  return prisma.smsGatewayAccount.findFirst({ where: { isDefault: true, isActive: true } });
}

export const smsAdapter: ChannelAdapter = {
  async send({ to, content }: ChannelSendInput): Promise<ChannelSendResult> {
    const account = await getDefaultAccount();
    if (!account?.apiIdentifier) return { success: false, error: "Passerelle SMS non configurée" };

    try {
      const response = await fetch(`${account.apiIdentifier.replace(/\/$/, "")}/api/3rdparty/v1/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(account.apiKey ? { Authorization: account.apiKey } : {}),
        },
        body: JSON.stringify({ message: content, phoneNumbers: [to] }),
      });
      if (!response.ok) {
        return { success: false, error: `Passerelle SMS : HTTP ${response.status}` };
      }
      const data = (await response.json().catch(() => null)) as { id?: string } | null;
      return { success: true, providerMessageId: data?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erreur d'envoi SMS" };
    }
  },

  async testConnection(): Promise<ChannelTestResult> {
    const account = await getDefaultAccount();
    if (!account?.apiIdentifier) return { success: false, message: "Aucun compte SMS par défaut configuré" };
    try {
      const response = await fetch(`${account.apiIdentifier.replace(/\/$/, "")}/api/health`, {
        headers: account.apiKey ? { Authorization: account.apiKey } : {},
      });
      return response.ok
        ? { success: true, message: "Passerelle SMS jointe avec succès." }
        : { success: false, message: `Passerelle SMS injoignable (HTTP ${response.status}).` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Passerelle SMS injoignable." };
    }
  },
};
